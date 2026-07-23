/**
 * Single source of truth (TypeScript side) for the park enum option lists and
 * the extractable-field type map. These MUST stay in sync with the Prisma enums
 * in prisma/schema.prisma (Terrain, Amenity, Camping, VehicleType, Ownership) —
 * Prisma enums can't be imported into TS, so this file mirrors them and is the
 * one place the Zod extraction schema, the admin review selectors, and field
 * validation all read from.
 *
 * This module is intentionally side-effect free (no SDK/client imports) so it is
 * safe to import into client components.
 */

export const TERRAIN_OPTIONS = [
  "sand",
  "rocks",
  "mud",
  "trails",
  "hills",
  "motocrossTrack",
] as const;

export const AMENITY_OPTIONS = [
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
] as const;

export const CAMPING_OPTIONS = [
  "tent",
  "rv30A",
  "rv50A",
  "fullHookup",
  "cabin",
  "groupSite",
  "backcountry",
] as const;

export const VEHICLE_TYPE_OPTIONS = [
  "motorcycle",
  "atv",
  "sxs",
  "fullSize",
] as const;

export const OWNERSHIP_OPTIONS = [
  "private",
  "public",
  "mixed",
  "unknown",
] as const;

/** Array (many-to-many) fields → their valid enum option list. */
export const ARRAY_FIELD_OPTIONS: Record<string, readonly string[]> = {
  terrain: TERRAIN_OPTIONS,
  amenities: AMENITY_OPTIONS,
  camping: CAMPING_OPTIONS,
  vehicleTypes: VEHICLE_TYPE_OPTIONS,
};

/**
 * Park fields the AI can extract, mapped to their value type. Used by the review
 * UI (to pick the right editor), the research pipeline (comparison), and the
 * lifecycle helpers (which fields still need research).
 */
export const EXTRACTABLE_FIELDS: Record<string, string> = {
  latitude: "number",
  longitude: "number",
  website: "string",
  phone: "string",
  campingWebsite: "string",
  campingPhone: "string",
  isFree: "boolean",
  dayPassUSD: "number",
  vehicleEntryFeeUSD: "number",
  riderFeeUSD: "number",
  membershipFeeUSD: "number",
  milesOfTrails: "number",
  acres: "number",
  notes: "string",
  datesOpen: "string",
  contactEmail: "string",
  ownership: "Ownership",
  permitRequired: "boolean",
  permitType: "string",
  membershipRequired: "boolean",
  maxVehicleWidthInches: "number",
  flagsRequired: "boolean",
  sparkArrestorRequired: "boolean",
  helmetsRequired: "boolean",
  noiseLimitDBA: "number",
  "address.streetAddress": "string",
  "address.city": "string",
  "address.zipCode": "string",
  "address.county": "string",
  terrain: "Terrain[]",
  amenities: "Amenity[]",
  camping: "Camping[]",
  vehicleTypes: "VehicleType[]",
};

/** Human-readable label for an enum option value shown in the review selectors. */
const OPTION_LABEL_OVERRIDES: Record<string, string> = {
  atv: "ATV",
  sxs: "Side-by-side (SxS)",
  fullSize: "Full-size 4x4",
  rv30A: "RV 30A",
  rv50A: "RV 50A",
  fullHookup: "Full hookup",
  groupSite: "Group site",
  motocrossTrack: "Motocross track",
  boatRamp: "Boat ramp",
  loadingRamp: "Loading ramp",
  picnicTable: "Picnic table",
  airStation: "Air station",
  trailMaps: "Trail maps",
  firstAid: "First aid",
  wifi: "Wi-Fi",
};

export function humanizeOption(value: string): string {
  if (OPTION_LABEL_OVERRIDES[value]) return OPTION_LABEL_OVERRIDES[value];
  const spaced = value.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}
