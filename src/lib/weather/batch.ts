/**
 * Batch helpers for the park-grid cards (OP-55 rain badge + severe-weather
 * badge).
 *
 * NWS does not expose a multi-point endpoint, so the parks-list page fans out
 * per park. Each worker fetches the forecast (for today's rain) AND the active
 * alerts (for the severe-weather badge) *in parallel*, so adding the weather
 * badge does not add a second fan-out pass. To keep first-render latency
 * bounded we cap concurrency and apply a per-park timeout — late responses
 * return empty and the badges simply don't render. Subsequent page loads hit
 * the NWS fetch cache (6h forecast / 10min alerts) and resolve immediately.
 */
import { getActiveAlerts, getForecast } from "./nws-client";
import type { AlertSeverity, WeatherAlert } from "./types";

interface BatchInput {
  parkId: string;
  latitude: number | null | undefined;
  longitude: number | null | undefined;
}

interface BatchOptions {
  /** Max parallel NWS calls. Default 12. */
  concurrency?: number;
  /** Per-park timeout in ms. Default 2000. */
  timeoutMs?: number;
}

/** Compact per-card weather summary. */
export interface CardWeather {
  /** Today's max precipitation probability (0–100), or null. */
  rainChance: number | null;
  /**
   * Severe/Extreme NWS alert summary for the card badge, or null when there
   * are no life-safety-grade alerts. Minor/Moderate advisories are omitted —
   * they stay on the detail page (matches the detail banner's Severe+ gate).
   * `event` is the NWS event name of the top alert (e.g. "Extreme Heat
   * Warning"), shown as the badge label.
   */
  severeWeather: {
    severity: "Severe" | "Extreme";
    event: string;
    count: number;
  } | null;
}

const EMPTY_CARD_WEATHER: CardWeather = { rainChance: null, severeWeather: null };

/** Alert severities prominent enough to earn a badge on the card. */
const SEVERE_CARD_SEVERITIES: ReadonlySet<AlertSeverity> = new Set([
  "Severe",
  "Extreme",
]);

function summarizeSevere(alerts: WeatherAlert[]): CardWeather["severeWeather"] {
  const severe = alerts.filter((a) => SEVERE_CARD_SEVERITIES.has(a.severity));
  if (severe.length === 0) return null;
  // Prefer an Extreme alert's title (and severity) over a Severe one so the
  // badge names the most serious active alert, e.g. "Extreme Heat Warning".
  const top = severe.find((a) => a.severity === "Extreme") ?? severe[0];
  return {
    severity: top.severity as "Severe" | "Extreme",
    event: top.event,
    count: severe.length,
  };
}

/**
 * Fetch today's rain probability + any Severe/Extreme weather alert for each
 * park. Returns a Map<parkId, CardWeather>. Parks without coords, parks whose
 * calls exceeded the per-park timeout, and parks outside NWS coverage all map
 * to an empty summary (the consuming UI hides both badges in that case).
 */
export async function getBatchParkCardWeather(
  parks: readonly BatchInput[],
  opts: BatchOptions = {},
): Promise<Map<string, CardWeather>> {
  const concurrency = opts.concurrency ?? 12;
  const timeoutMs = opts.timeoutMs ?? 2000;
  const results = new Map<string, CardWeather>();
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < parks.length) {
      const i = cursor++;
      const park = parks[i];
      if (park.latitude == null || park.longitude == null) {
        results.set(park.parkId, { ...EMPTY_CARD_WEATHER });
        continue;
      }
      const lat = park.latitude;
      const lng = park.longitude;
      const fetched: Promise<CardWeather> = Promise.all([
        getForecast(park.parkId, lat, lng)
          .then((f) => f[0]?.precipProbability ?? null)
          .catch(() => null),
        getActiveAlerts(park.parkId, lat, lng)
          .then(summarizeSevere)
          .catch(() => null),
      ]).then(([rainChance, severeWeather]) => ({ rainChance, severeWeather }));
      const timed = new Promise<CardWeather>((resolve) =>
        setTimeout(() => resolve({ ...EMPTY_CARD_WEATHER }), timeoutMs),
      );
      const value = await Promise.race([fetched, timed]);
      results.set(park.parkId, value);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, parks.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
