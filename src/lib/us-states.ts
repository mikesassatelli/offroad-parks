/**
 * Canonical US state handling.
 *
 * The app stores `park.address.state` as the full state name (e.g. "Arkansas").
 * The AI extraction pipeline historically sometimes wrote 2-letter codes
 * (e.g. "AR"), which bled through into the filter dropdown. Use
 * `normalizeStateName` at every write boundary to keep the DB canonical.
 */

/**
 * All 50 US state full names, sorted alphabetically.
 * DC is intentionally excluded — the rest of the repo (US_STATES in
 * src/lib/constants.ts, the submit form dropdown, the bulk-upload validator)
 * treats the domain as the 50 states only.
 */
export const US_STATE_NAMES = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
] as const;

export type USStateName = (typeof US_STATE_NAMES)[number];

/**
 * 2-letter postal code → canonical full name. Keys are uppercase.
 */
export const STATE_CODE_TO_NAME: Readonly<Record<string, USStateName>> = {
  AL: "Alabama",
  AK: "Alaska",
  AZ: "Arizona",
  AR: "Arkansas",
  CA: "California",
  CO: "Colorado",
  CT: "Connecticut",
  DE: "Delaware",
  FL: "Florida",
  GA: "Georgia",
  HI: "Hawaii",
  ID: "Idaho",
  IL: "Illinois",
  IN: "Indiana",
  IA: "Iowa",
  KS: "Kansas",
  KY: "Kentucky",
  LA: "Louisiana",
  ME: "Maine",
  MD: "Maryland",
  MA: "Massachusetts",
  MI: "Michigan",
  MN: "Minnesota",
  MS: "Mississippi",
  MO: "Missouri",
  MT: "Montana",
  NE: "Nebraska",
  NV: "Nevada",
  NH: "New Hampshire",
  NJ: "New Jersey",
  NM: "New Mexico",
  NY: "New York",
  NC: "North Carolina",
  ND: "North Dakota",
  OH: "Ohio",
  OK: "Oklahoma",
  OR: "Oregon",
  PA: "Pennsylvania",
  RI: "Rhode Island",
  SC: "South Carolina",
  SD: "South Dakota",
  TN: "Tennessee",
  TX: "Texas",
  UT: "Utah",
  VT: "Vermont",
  VA: "Virginia",
  WA: "Washington",
  WV: "West Virginia",
  WI: "Wisconsin",
  WY: "Wyoming",
} as const;

/**
 * Full name (lowercased) → canonical full name. Used by `normalizeStateName`
 * to handle arbitrary casing ("arkansas", "NEW MEXICO").
 */
const LOWER_NAME_TO_CANONICAL: Readonly<Record<string, USStateName>> =
  Object.fromEntries(
    US_STATE_NAMES.map((name) => [name.toLowerCase(), name])
  ) as Record<string, USStateName>;

/**
 * Look up the canonical full state name from a 2-letter code.
 * Case-insensitive; whitespace is trimmed.
 * Returns null for unknown codes.
 */
export function stateCodeToName(code: string): USStateName | null {
  if (typeof code !== "string") return null;
  const key = code.trim().toUpperCase();
  if (key.length !== 2) return null;
  return STATE_CODE_TO_NAME[key] ?? null;
}

/**
 * Normalize any of:
 *   - full state name in any case ("arkansas", "ARKANSAS", "Arkansas")
 *   - 2-letter postal code in any case ("AR", "ar", " Ar ")
 *   - surrounding whitespace
 *
 * Returns the canonical full name (e.g. "Arkansas") or null if the input
 * can't be resolved to a known US state.
 *
 * Non-string input returns null so callers can validate unknown payloads.
 */
export function normalizeStateName(input: unknown): USStateName | null {
  if (typeof input !== "string") return null;

  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  // Collapse any internal whitespace runs so "new  mexico" → "new mexico".
  const collapsed = trimmed.replace(/\s+/g, " ");

  // Try 2-letter code first (cheap).
  if (collapsed.length === 2) {
    const byCode = STATE_CODE_TO_NAME[collapsed.toUpperCase()];
    if (byCode) return byCode;
    return null;
  }

  // Otherwise try full name (case-insensitive).
  const byName = LOWER_NAME_TO_CANONICAL[collapsed.toLowerCase()];
  return byName ?? null;
}

/**
 * Type guard: is the value already a canonical US state name?
 */
export function isCanonicalStateName(value: unknown): value is USStateName {
  return (
    typeof value === "string" &&
    (US_STATE_NAMES as readonly string[]).includes(value)
  );
}
