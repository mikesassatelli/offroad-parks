/**
 * Map NWS condition strings → a small keyword enum, then resolve to a Lucide
 * icon at the call site via a static Record. The enum indirection lets
 * consumers use the same lookup pattern as ParkAlertsBanner's SEVERITY_ICON,
 * which avoids the react-hooks/static-components lint rule that flags
 * `const Icon = func(...)` reassignment in render.
 *
 * NWS uses free-text descriptions (e.g. "Mostly Sunny", "Areas of Fog");
 * we match by keyword in priority order — more specific terms first.
 */

export type WeatherIconKey =
  | "thunderstorm"
  | "hail"
  | "snow"
  | "sleet"
  | "drizzle"
  | "rain"
  | "fog"
  | "wind"
  | "partlyCloudy"
  | "cloudy"
  | "sunny"
  | "unknown";

interface IconRule {
  keywords: readonly string[];
  key: WeatherIconKey;
}

// Order matters — first match wins. More specific phrases go first.
const RULES: readonly IconRule[] = [
  { keywords: ["thunderstorm", "thunder", "lightning"], key: "thunderstorm" },
  { keywords: ["hail"], key: "hail" },
  { keywords: ["blizzard", "snow shower", "snow"], key: "snow" },
  { keywords: ["freezing", "sleet", "ice"], key: "sleet" },
  { keywords: ["drizzle"], key: "drizzle" },
  { keywords: ["rain", "shower"], key: "rain" },
  { keywords: ["fog", "haze", "mist"], key: "fog" },
  { keywords: ["wind", "breezy", "blustery"], key: "wind" },
  { keywords: ["partly", "mostly cloudy", "partly sunny"], key: "partlyCloudy" },
  { keywords: ["cloud", "overcast"], key: "cloudy" },
  { keywords: ["sunny", "clear", "fair", "hot"], key: "sunny" },
];

/**
 * Classify a NWS condition string into a stable keyword. Used at call sites
 * to index into an icon Record. Returns "unknown" for nulls / unmatched.
 */
export function weatherIconKey(
  condition: string | null | undefined,
): WeatherIconKey {
  if (!condition) return "unknown";
  const lower = condition.toLowerCase();
  for (const rule of RULES) {
    if (rule.keywords.some((k) => lower.includes(k))) {
      return rule.key;
    }
  }
  return "unknown";
}
