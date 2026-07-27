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

/**
 * Curated subset of {@link EXTRACTABLE_FIELDS} that end users are allowed to
 * correct via the "Suggest a correction" dialog. Kept intentionally narrow to
 * user-verifiable facts (contact info, fees, access rules, address) — the full
 * extractable set includes fields like latitude/notes that we don't expose to
 * public field-level correction. The POST /api/parks/[slug]/corrections route
 * validates `fieldName` against this list; the dialog builds its picker from it.
 */
export const CORRECTABLE_FIELDS = [
  "website",
  "phone",
  "campingWebsite",
  "campingPhone",
  "isFree",
  "dayPassUSD",
  "vehicleEntryFeeUSD",
  "riderFeeUSD",
  "membershipFeeUSD",
  "milesOfTrails",
  "acres",
  "datesOpen",
  "contactEmail",
  "ownership",
  "permitRequired",
  "permitType",
  "membershipRequired",
  "flagsRequired",
  "sparkArrestorRequired",
  "helmetsRequired",
  "address.streetAddress",
  "address.city",
  "address.zipCode",
] as const;

export type CorrectableField = (typeof CORRECTABLE_FIELDS)[number];

/** Fast membership test for the curated correctable subset. */
const CORRECTABLE_FIELD_SET = new Set<string>(CORRECTABLE_FIELDS);

export function isCorrectableField(field: string): field is CorrectableField {
  return CORRECTABLE_FIELD_SET.has(field);
}

/**
 * The value-type (from {@link EXTRACTABLE_FIELDS}) for a correctable field. Used
 * by the dialog to pick the right input control and by the route to coerce/
 * validate the submitted value.
 * - "boolean" → toggle
 * - "number"  → number input
 * - "Ownership" → enum select (see OWNERSHIP_OPTIONS)
 * - "string"  → text input
 */
export function correctableFieldType(field: CorrectableField): string {
  return EXTRACTABLE_FIELDS[field];
}

/** Human-readable label for a correctable field name (for the picker + admin). */
const FIELD_LABEL_OVERRIDES: Record<string, string> = {
  website: "Website",
  phone: "Phone",
  campingWebsite: "Camping website",
  campingPhone: "Camping phone",
  isFree: "Free to enter",
  dayPassUSD: "Day pass ($)",
  vehicleEntryFeeUSD: "Vehicle entry fee ($)",
  riderFeeUSD: "Rider fee ($)",
  membershipFeeUSD: "Membership fee ($)",
  milesOfTrails: "Miles of trails",
  acres: "Acres",
  datesOpen: "Dates open",
  contactEmail: "Contact email",
  ownership: "Ownership",
  permitRequired: "Permit required",
  permitType: "Permit type",
  membershipRequired: "Membership required",
  flagsRequired: "Flags required",
  sparkArrestorRequired: "Spark arrestor required",
  helmetsRequired: "Helmets required",
  "address.streetAddress": "Street address",
  "address.city": "City",
  "address.zipCode": "ZIP code",
};

export function humanizeFieldName(field: string): string {
  if (FIELD_LABEL_OVERRIDES[field]) return FIELD_LABEL_OVERRIDES[field];
  const bare = field.includes(".") ? field.split(".").pop()! : field;
  return humanizeOption(bare);
}

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
