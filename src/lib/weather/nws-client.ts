/**
 * NWS (National Weather Service) client (OP-52).
 *
 * api.weather.gov is free and authoritative for US weather + alerts. Two-step
 * lookup: /points/{lat},{lng} returns a stable grid identifier, then
 * /gridpoints/{office}/{x},{y}/forecast returns the actual forecast.
 *
 * Caching: Next.js fetch cache with tags. Grid lookups are cached
 * indefinitely (revalidate: false) — the grid for a coordinate never
 * changes. Forecast / current / alerts get short TTLs. Coord edits invalidate
 * via revalidateTag("park:{parkId}:weather").
 *
 * NWS asks API consumers to identify themselves via User-Agent.
 */

import type {
  CurrentConditions,
  DailyForecast,
  ForecastPeriod,
  NwsGrid,
  ParkWeather,
  WeatherAlert,
} from "./types";

const NWS_BASE = "https://api.weather.gov";
const USER_AGENT = "offroad-parks (mike.sassatelli@gmail.com)";

const GRID_TAG_PREFIX = "park:";
const GRID_TAG_SUFFIX = ":weather";

const FORECAST_TTL_SECONDS = 6 * 60 * 60; // 6h
const CURRENT_TTL_SECONDS = 30 * 60; // 30min
const ALERTS_TTL_SECONDS = 10 * 60; // 10min

function tagForPark(parkId: string): string {
  return `${GRID_TAG_PREFIX}${parkId}${GRID_TAG_SUFFIX}`;
}

interface NwsFetchOpts {
  parkId: string;
  /** seconds, or false for indefinite. */
  revalidate: number | false;
}

/**
 * Wrapper around fetch that adds the NWS-required User-Agent and Next.js
 * fetch cache config. Returns null on any non-OK response — NWS is reliable
 * but does 5xx occasionally; the UI should degrade gracefully rather than
 * crash a park detail page.
 */
async function nwsFetch<T>(url: string, opts: NwsFetchOpts): Promise<T | null> {
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": USER_AGENT,
        Accept: "application/geo+json",
      },
      next: {
        revalidate: opts.revalidate,
        tags: [tagForPark(opts.parkId)],
      },
    });
    if (!res.ok) {
      return null;
    }
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

interface NwsPointsResponse {
  properties: {
    gridId: string;
    gridX: number;
    gridY: number;
    forecast: string;
    forecastHourly: string;
    observationStations: string;
    relativeLocation?: {
      properties?: {
        city?: string;
        state?: string;
      };
    };
  };
}

/**
 * Resolve a coordinate to an NWS grid. Cached indefinitely keyed by URL;
 * invalidated via the park's weather tag when coords change.
 *
 * Returns null when NWS does not cover the coord (e.g. outside US) or the
 * request fails.
 */
export async function getOrResolveGrid(
  parkId: string,
  lat: number,
  lng: number,
): Promise<NwsGrid | null> {
  // Round to 4 decimal places (~11m) to maximize cache key reuse between
  // near-identical coord queries and to satisfy NWS's input expectations.
  const roundedLat = Math.round(lat * 10000) / 10000;
  const roundedLng = Math.round(lng * 10000) / 10000;
  const url = `${NWS_BASE}/points/${roundedLat},${roundedLng}`;

  const data = await nwsFetch<NwsPointsResponse>(url, {
    parkId,
    revalidate: false,
  });
  if (!data) return null;

  const p = data.properties;
  return {
    office: p.gridId,
    gridX: p.gridX,
    gridY: p.gridY,
    forecastUrl: p.forecast,
    forecastHourlyUrl: p.forecastHourly,
    stationsUrl: p.observationStations,
    city: p.relativeLocation?.properties?.city ?? null,
    state: p.relativeLocation?.properties?.state ?? null,
  };
}

interface NwsForecastResponse {
  properties: {
    periods: Array<{
      name: string;
      startTime: string;
      endTime: string;
      isDaytime: boolean;
      temperature: number;
      temperatureUnit: string;
      probabilityOfPrecipitation: { value: number | null };
      shortForecast: string;
      icon: string;
    }>;
  };
}

function periodFromRaw(
  raw: NwsForecastResponse["properties"]["periods"][number],
): ForecastPeriod {
  return {
    name: raw.name,
    startTime: raw.startTime,
    isDaytime: raw.isDaytime,
    temperatureF: raw.temperature,
    precipProbability: raw.probabilityOfPrecipitation?.value ?? null,
    shortForecast: raw.shortForecast,
    iconCode: raw.icon ?? null,
  };
}

/**
 * Fold NWS's alternating day/night periods into one entry per calendar day.
 * NWS returns up to ~14 periods (today + 6 days, each with day+night). We
 * keep the first 5 days for the OP-53 display row.
 */
function periodsToDaily(periods: ForecastPeriod[]): DailyForecast[] {
  const byDate = new Map<string, { day?: ForecastPeriod; night?: ForecastPeriod }>();

  for (const period of periods) {
    const date = period.startTime.slice(0, 10);
    const entry = byDate.get(date) ?? {};
    if (period.isDaytime) {
      entry.day = period;
    } else {
      entry.night = period;
    }
    byDate.set(date, entry);
  }

  const out: DailyForecast[] = [];
  const sortedDates = Array.from(byDate.keys()).sort();
  for (const date of sortedDates) {
    const { day, night } = byDate.get(date)!;
    const ref = day ?? night;
    if (!ref) continue;

    const high = day?.temperatureF ?? null;
    const low = night?.temperatureF ?? null;
    const precips = [
      day?.precipProbability,
      night?.precipProbability,
    ].filter((p): p is number => typeof p === "number");
    const maxPrecip = precips.length > 0 ? Math.max(...precips) : null;

    out.push({
      date,
      dayName: dayNameFromIso(ref.startTime),
      highF: high,
      lowF: low,
      precipProbability: maxPrecip,
      shortForecast: (day ?? night)!.shortForecast,
      iconCode: (day ?? night)!.iconCode,
    });
  }

  return out.slice(0, 5);
}

function dayNameFromIso(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

/**
 * 5-day forecast for a park. Returns [] on any failure (including
 * unresolvable grid) so the UI can render an empty state cleanly.
 */
export async function getForecast(
  parkId: string,
  lat: number,
  lng: number,
): Promise<DailyForecast[]> {
  const grid = await getOrResolveGrid(parkId, lat, lng);
  if (!grid) return [];

  const data = await nwsFetch<NwsForecastResponse>(grid.forecastUrl, {
    parkId,
    revalidate: FORECAST_TTL_SECONDS,
  });
  if (!data) return [];

  const periods = data.properties.periods.map(periodFromRaw);
  return periodsToDaily(periods);
}

interface NwsStationsResponse {
  features: Array<{
    id: string;
    properties: {
      stationIdentifier: string;
    };
  }>;
}

interface NwsObservationResponse {
  properties: {
    timestamp: string;
    textDescription: string;
    icon: string | null;
    temperature: { unitCode: string; value: number | null };
    windChill: { unitCode: string; value: number | null };
    heatIndex: { unitCode: string; value: number | null };
  };
}

/**
 * Convert a unit-coded value to Fahrenheit. NWS observation values come
 * back in Celsius (`wmoUnit:degC`) by default; older endpoints used `unit:degF`.
 * Defensive: if the unit code is unrecognized we assume Celsius.
 */
function toFahrenheit(value: number | null, unitCode: string): number | null {
  if (value == null) return null;
  if (unitCode.endsWith("degF")) return value;
  // Default to Celsius -> Fahrenheit
  return Math.round((value * 9) / 5 + 32);
}

/**
 * Current conditions for a park, pulled from the nearest reporting station.
 * Returns null when no station has a recent valid observation — many remote
 * stations report only intermittently. UI must handle null gracefully.
 */
export async function getCurrentConditions(
  parkId: string,
  lat: number,
  lng: number,
): Promise<CurrentConditions | null> {
  const grid = await getOrResolveGrid(parkId, lat, lng);
  if (!grid) return null;

  const stations = await nwsFetch<NwsStationsResponse>(grid.stationsUrl, {
    parkId,
    revalidate: false, // station list is stable
  });
  if (!stations || stations.features.length === 0) return null;

  // Try the first 3 stations until one returns a usable temperature. NWS
  // station availability is uneven; some return null temperatures.
  for (const station of stations.features.slice(0, 3)) {
    const stationId = station.properties.stationIdentifier;
    const obsUrl = `${NWS_BASE}/stations/${stationId}/observations/latest`;
    const obs = await nwsFetch<NwsObservationResponse>(obsUrl, {
      parkId,
      revalidate: CURRENT_TTL_SECONDS,
    });
    if (!obs) continue;
    const temp = toFahrenheit(
      obs.properties.temperature.value,
      obs.properties.temperature.unitCode,
    );
    if (temp == null) continue;

    const heatIndex = toFahrenheit(
      obs.properties.heatIndex.value,
      obs.properties.heatIndex.unitCode,
    );
    const windChill = toFahrenheit(
      obs.properties.windChill.value,
      obs.properties.windChill.unitCode,
    );
    const feelsLike = heatIndex ?? windChill ?? null;

    return {
      temperatureF: temp,
      feelsLikeF: feelsLike,
      shortForecast: obs.properties.textDescription ?? "",
      iconCode: obs.properties.icon ?? null,
      observedAt: obs.properties.timestamp,
    };
  }
  return null;
}

interface NwsAlertsResponse {
  features: Array<{
    properties: {
      id: string;
      event: string;
      severity: string;
      headline: string | null;
      description: string;
      effective: string;
      expires: string | null;
      urgency: string;
    };
  }>;
}

const VALID_SEVERITIES: ReadonlySet<string> = new Set([
  "Extreme",
  "Severe",
  "Moderate",
  "Minor",
  "Unknown",
]);

/**
 * Active NWS alerts at a park's coordinates. Empty array on no alerts /
 * fetch failure. Severity is normalized to the typed enum so callers can
 * trust the value.
 */
export async function getActiveAlerts(
  parkId: string,
  lat: number,
  lng: number,
): Promise<WeatherAlert[]> {
  const roundedLat = Math.round(lat * 10000) / 10000;
  const roundedLng = Math.round(lng * 10000) / 10000;
  const url = `${NWS_BASE}/alerts/active?point=${roundedLat},${roundedLng}`;

  const data = await nwsFetch<NwsAlertsResponse>(url, {
    parkId,
    revalidate: ALERTS_TTL_SECONDS,
  });
  if (!data) return [];

  return data.features.map((f) => {
    const severity = VALID_SEVERITIES.has(f.properties.severity)
      ? (f.properties.severity as WeatherAlert["severity"])
      : "Unknown";
    return {
      id: f.properties.id,
      event: f.properties.event,
      severity,
      headline: f.properties.headline,
      description: f.properties.description,
      effective: f.properties.effective,
      expires: f.properties.expires,
      urgency: f.properties.urgency,
    };
  });
}

/**
 * Convenience: fetch all three weather surfaces for a park in parallel.
 * Each surface degrades independently to null/empty on failure.
 */
export async function getParkWeather(
  parkId: string,
  lat: number,
  lng: number,
): Promise<ParkWeather> {
  const [current, forecast, alerts] = await Promise.all([
    getCurrentConditions(parkId, lat, lng),
    getForecast(parkId, lat, lng),
    getActiveAlerts(parkId, lat, lng),
  ]);
  return { current, forecast, alerts };
}
