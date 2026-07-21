/**
 * Compact alert pills for park cards. Surfaces the two automated alert
 * categories a browsing user most needs to see before clicking in:
 *
 *   - Official closure (red/amber, "no-entry" icon) — an agency closure from
 *     the cron scraper (e.g. Iowa DNR OHV). Deliberately the loudest badge.
 *   - Severe weather (amber/orange, weather icon) — an active Severe/Extreme
 *     NWS alert at the park's coordinates.
 *
 * Kept intentionally distinct from RainBadge (Droplets) and ConditionBadge so
 * a closure never reads as "just rain." Renders nothing when neither applies.
 */
import { Ban, CloudLightning } from "lucide-react";
import type { ParkCardAlertSummary } from "@/lib/types";

interface ParkAlertBadgesProps {
  summary: ParkCardAlertSummary | null | undefined;
}

function ClosureBadge({
  closure,
}: {
  closure: NonNullable<ParkCardAlertSummary["officialClosure"]>;
}) {
  const closed = closure.severity === "DANGER";
  const classes = closed
    ? "bg-red-600 text-white ring-red-700/50"
    : "bg-amber-500 text-white ring-amber-600/50";
  const label = closed ? "Closed" : "Limited";
  const aria = closed
    ? "Official closure — park closed"
    : "Official closure — limited use";
  return (
    <div
      data-testid="closure-badge"
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold shadow-sm ring-1 ${classes}`}
      aria-label={aria}
      title={aria}
    >
      <Ban className="w-3 h-3" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

function WeatherBadge({
  weather,
}: {
  weather: NonNullable<ParkCardAlertSummary["severeWeather"]>;
}) {
  const extreme = weather.severity === "Extreme";
  const classes = extreme
    ? "bg-orange-600 text-white ring-orange-700/50"
    : "bg-amber-100 text-amber-900 ring-amber-300/60 dark:bg-amber-900/70 dark:text-amber-100 dark:ring-amber-700/60";
  const aria = `${weather.count} active ${
    extreme ? "extreme" : "severe"
  } weather ${weather.count === 1 ? "alert" : "alerts"}`;
  return (
    <div
      data-testid="weather-badge"
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shadow-sm ring-1 ${classes}`}
      aria-label={aria}
      title={aria}
    >
      <CloudLightning className="w-3 h-3" aria-hidden="true" />
      <span>Weather{weather.count > 1 ? ` ×${weather.count}` : ""}</span>
    </div>
  );
}

export function ParkAlertBadges({ summary }: ParkAlertBadgesProps) {
  if (!summary) return null;
  const { officialClosure, severeWeather } = summary;
  if (!officialClosure && !severeWeather) return null;

  return (
    <div
      className="flex flex-col items-start gap-1"
      data-testid="park-alert-badges"
    >
      {officialClosure && <ClosureBadge closure={officialClosure} />}
      {severeWeather && <WeatherBadge weather={severeWeather} />}
    </div>
  );
}
