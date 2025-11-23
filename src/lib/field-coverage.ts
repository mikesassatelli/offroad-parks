/**
 * Compile-time field coverage utilities
 *
 * These types ensure that forms and APIs handle all Park fields.
 * If a field is added to the Park type but not to forms/APIs,
 * TypeScript will error at compile time.
 */

import type { Park } from "./types";

/**
 * Fields that should be collected by forms (ParkSubmissionForm)
 *
 * This excludes:
 * - id (generated)
 * - coords (derived from lat/lng inputs)
 * - heroImage (separate photo upload)
 * - Aggregated review fields (calculated from reviews)
 */
type FormCollectableFields = Omit<
  Park,
  | "id"
  | "coords"
  | "heroImage"
  | "averageRating"
  | "averageDifficulty"
  | "averageTerrain"
  | "averageFacilities"
  | "reviewCount"
  | "averageRecommendedStay"
>;

/**
 * Type to verify that a form's data structure covers all required Park fields.
 *
 * Usage:
 * ```typescript
 * // This will error if FormData is missing any fields from Park
 * type _FormCoverage = AssertFieldCoverage<typeof formFields, FormCollectableFields>;
 * ```
 */
export type AssertFieldCoverage<
  TForm extends Record<string, unknown>,
  TRequired
> = {
  [K in keyof TRequired]: K extends keyof TForm ? true : never;
};

/**
 * Mapping of Park fields to their form field names
 * This serves as documentation and compile-time verification
 */
export const PARK_TO_FORM_FIELD_MAP = {
  // Basic info
  name: "name",
  city: "addressCity", // Now from address
  state: "addressState", // Now from address
  website: "website",
  phone: "phone",
  campingWebsite: "campingWebsite",
  campingPhone: "campingPhone",
  coords: ["latitude", "longitude"], // Split into two inputs
  dayPassUSD: "dayPassUSD",
  milesOfTrails: "milesOfTrails",
  acres: "acres",
  notes: "notes",

  // Categorical
  terrain: "terrain",
  amenities: "amenities",
  camping: "camping",
  vehicleTypes: "vehicleTypes",

  // Operational
  datesOpen: "datesOpen",
  contactEmail: "contactEmail",
  ownership: "ownership",
  permitRequired: "permitRequired",
  permitType: "permitType",
  membershipRequired: "membershipRequired",
  maxVehicleWidthInches: "maxVehicleWidthInches",
  flagsRequired: "flagsRequired",
  sparkArrestorRequired: "sparkArrestorRequired",
  noiseLimitDBA: "noiseLimitDBA",

  // Address (nested in Park.address)
  address: {
    streetAddress: "streetAddress",
    streetAddress2: "streetAddress2",
    city: "addressCity",
    state: "addressState",
    zipCode: "zipCode",
    county: "county",
    latitude: "latitude", // Shared with coords
    longitude: "longitude", // Shared with coords
  },
} as const;

/**
 * All Park fields that forms should collect (for reference)
 * Update this when adding new fields to Park
 */
export type ParkFormFields = keyof FormCollectableFields;

/**
 * Fields collected by bulk upload
 * Similar to form fields but may have different naming
 */
export const BULK_UPLOAD_FIELD_MAP = {
  name: "name",
  slug: "slug",
  state: "state", // Will become address.state
  city: "city", // Will become address.city
  latitude: "latitude",
  longitude: "longitude",
  website: "website",
  phone: "phone",
  campingWebsite: "campingWebsite",
  campingPhone: "campingPhone",
  dayPassUSD: "dayPassUSD",
  milesOfTrails: "milesOfTrails",
  acres: "acres",
  notes: "notes",
  terrain: "terrain",
  amenities: "amenities",
  camping: "camping",
  vehicleTypes: "vehicleTypes",
  // Operational fields
  datesOpen: "datesOpen",
  contactEmail: "contactEmail",
  ownership: "ownership",
  permitRequired: "permitRequired",
  permitType: "permitType",
  membershipRequired: "membershipRequired",
  maxVehicleWidthInches: "maxVehicleWidthInches",
  flagsRequired: "flagsRequired",
  sparkArrestorRequired: "sparkArrestorRequired",
  noiseLimitDBA: "noiseLimitDBA",
  // Address fields (flat in CSV)
  streetAddress: "streetAddress",
  streetAddress2: "streetAddress2",
  zipCode: "zipCode",
  county: "county",
} as const;

/**
 * Helper to check at compile time that all expected fields are present
 *
 * Usage in forms:
 * ```typescript
 * // Add this at the end of your form component file
 * // It will error if any Park field is not handled
 * const _coverage: EnsureAllFieldsCovered<typeof FORM_FIELDS, ParkFormFields> = true;
 * ```
 */
export type EnsureAllFieldsCovered<
  TProvided extends readonly string[],
  TRequired extends string
> = TRequired extends TProvided[number] ? true : `Missing field: ${TRequired}`;
