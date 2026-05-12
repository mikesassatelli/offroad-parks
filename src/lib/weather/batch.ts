/**
 * Batch helpers for OP-55 — page-grid rain badges fetched per visible card.
 *
 * NWS does not expose a multi-point endpoint, so the parks-list page fans
 * out one `getForecast` call per park. To keep first-render latency
 * bounded we cap concurrency *and* apply a per-park timeout — late
 * responses return null and the badge simply doesn't render. Subsequent
 * page loads hit the 6h forecast cache and resolve immediately.
 */
import { getForecast } from "./nws-client";

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

/**
 * Fetch today's max precipitation probability for each park. Returns a
 * Map<parkId, probability | null>. Parks without coords, parks whose call
 * exceeded the per-park timeout, and parks outside NWS coverage all map
 * to null (the consuming UI hides the badge in that case).
 */
export async function getBatchRainProbabilities(
  parks: readonly BatchInput[],
  opts: BatchOptions = {},
): Promise<Map<string, number | null>> {
  const concurrency = opts.concurrency ?? 12;
  const timeoutMs = opts.timeoutMs ?? 2000;
  const results = new Map<string, number | null>();
  let cursor = 0;

  async function worker(): Promise<void> {
    while (cursor < parks.length) {
      const i = cursor++;
      const park = parks[i];
      if (park.latitude == null || park.longitude == null) {
        results.set(park.parkId, null);
        continue;
      }
      const fetched = getForecast(park.parkId, park.latitude, park.longitude)
        .then((f) => f[0]?.precipProbability ?? null)
        .catch(() => null);
      const timed = new Promise<null>((resolve) =>
        setTimeout(() => resolve(null), timeoutMs),
      );
      const value = await Promise.race([fetched, timed]);
      results.set(park.parkId, value);
    }
  }

  const workerCount = Math.max(1, Math.min(concurrency, parks.length));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return results;
}
