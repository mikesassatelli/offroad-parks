/**
 * Weather types (OP-52). Surface-level shapes consumed by UI components —
 * intentionally minimal and decoupled from raw NWS payloads. The NWS client
 * maps from the api.weather.gov response shapes into these.
 */

/**
 * NWS grid identifier. Returned by /points/{lat},{lng}. Stable for a given
 * coordinate, so cached indefinitely keyed by URL with a coord-invalidation tag.
 */
export interface NwsGrid {
  office: string;
  gridX: number;
  gridY: number;
  forecastUrl: string;
  forecastHourlyUrl: string;
  stationsUrl: string;
  city: string | null;
  state: string | null;
}

export interface CurrentConditions {
  temperatureF: number | null;
  feelsLikeF: number | null;
  shortForecast: string;
  /** NWS icon URL — used only to derive a Lucide icon via icons.ts. */
  iconCode: string | null;
  observedAt: string;
}

export interface ForecastPeriod {
  /** "Today" | "Tonight" | "Monday" | "Monday Night" | etc. */
  name: string;
  startTime: string;
  isDaytime: boolean;
  temperatureF: number;
  /** 0–100, or null when NWS did not return a value. */
  precipProbability: number | null;
  shortForecast: string;
  iconCode: string | null;
}

/**
 * 5-day display-shape: one daytime entry + one overnight entry per calendar
 * day, normalized into hi/lo. NWS returns 7-period sequences (today + 6 days
 * = 13 periods); we pair-fold them.
 */
export interface DailyForecast {
  date: string;
  dayName: string;
  highF: number | null;
  lowF: number | null;
  /** Higher of day/night precip probability. */
  precipProbability: number | null;
  shortForecast: string;
  iconCode: string | null;
}

export type AlertSeverity =
  | "Extreme"
  | "Severe"
  | "Moderate"
  | "Minor"
  | "Unknown";

export interface WeatherAlert {
  id: string;
  event: string;
  severity: AlertSeverity;
  headline: string | null;
  description: string;
  effective: string;
  expires: string | null;
  /** "Immediate" | "Expected" | "Future" | "Past" | "Unknown" */
  urgency: string;
}

/**
 * Light helper bundle returned by `getParkWeather` — single call from server
 * components, avoids the awkward `await Promise.all(...)` boilerplate at
 * call sites.
 */
export interface ParkWeather {
  current: CurrentConditions | null;
  forecast: DailyForecast[];
  alerts: WeatherAlert[];
}
