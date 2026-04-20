import type {
  Amenity,
  Camping,
  Ownership,
  RecommendedDuration,
  Terrain,
  VehicleType,
  VisitCondition,
} from "@/lib/types";
import { US_STATE_NAMES } from "@/lib/us-states";

export const ALL_AMENITIES: Amenity[] = [
  "restrooms",
  "showers",
  "food",
  "fuel",
  "repair",
  "boatRamp",
  "loadingRamp",
  "picnicTable",
  "shelter",
  "grill",
  "playground",
  "wifi",
  "fishing",
  "airStation",
  "trailMaps",
  "rentals",
  "training",
  "firstAid",
  "store",
];

export const ALL_CAMPING_TYPES: Camping[] = [
  "tent",
  "rv30A",
  "rv50A",
  "fullHookup",
  "cabin",
  "groupSite",
  "backcountry",
];

export const ALL_TERRAIN_TYPES: Terrain[] = [
  "sand",
  "rocks",
  "mud",
  "trails",
  "hills",
  "motocrossTrack",
];

export const ALL_VEHICLE_TYPES: VehicleType[] = [
  "motorcycle",
  "atv",
  "sxs",
  "fullSize",
];

/**
 * Re-export of the canonical 50-state list. Kept as a mutable string[] for
 * backwards compatibility with callers that use `includes` on `string` input.
 * For new code, prefer importing `US_STATE_NAMES` or using
 * `normalizeStateName` from `@/lib/us-states`.
 */
export const US_STATES: string[] = [...US_STATE_NAMES];

// Review system constants
export const ALL_VISIT_CONDITIONS: VisitCondition[] = [
  "dry",
  "muddy",
  "snow",
  "wet",
  "mixed",
];

export const ALL_RECOMMENDED_DURATIONS: RecommendedDuration[] = [
  "quickRide",
  "halfDay",
  "fullDay",
  "overnight",
];

export const RATING_OPTIONS = [1, 2, 3, 4, 5] as const;

export const MIN_RATING_FILTERS = [
  { value: "", label: "Any Rating" },
  { value: "3", label: "3+ Stars" },
  { value: "4", label: "4+ Stars" },
  { value: "4.5", label: "4.5+ Stars" },
];

// Ownership types
export const ALL_OWNERSHIP_TYPES: Ownership[] = [
  "private",
  "public",
  "mixed",
  "unknown",
];
