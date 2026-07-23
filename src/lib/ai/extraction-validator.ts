import { STATE_BOUNDING_BOXES } from "./state-bounding-boxes";

export type ValidationResult = {
  valid: boolean;
  reason?: string;
};

export const PRICE_FIELDS = new Set([
  "dayPassUSD",
  "vehicleEntryFeeUSD",
  "riderFeeUSD",
  "membershipFeeUSD",
]);

export const PHONE_FIELDS = new Set(["phone", "campingPhone"]);

export const URL_FIELDS = new Set(["website", "campingWebsite"]);

// Quantity fields where a value of 0 (or negative) is meaningless — a park with
// "0 miles of trails" or "0 acres" is a bad extraction, not a real data point.
// These get dropped rather than queued for review.
export const POSITIVE_QUANTITY_FIELDS = new Set([
  "milesOfTrails",
  "acres",
  "maxVehicleWidthInches",
  "noiseLimitDBA",
]);

/**
 * Validate a single extracted field value.
 * Returns { valid: true } if the value is acceptable,
 * or { valid: false, reason: "..." } if it should be dropped.
 */
export function validateExtraction(
  fieldName: string,
  value: unknown,
  parkState: string | null,
): ValidationResult {
  // --- Latitude ---
  if (fieldName === "latitude") {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return { valid: false, reason: "latitude must be a number" };
    }
    if (value < -90 || value > 90) {
      return { valid: false, reason: `latitude ${value} outside valid range (-90 to 90)` };
    }
    if (parkState) {
      const bbox = STATE_BOUNDING_BOXES[parkState.toUpperCase()];
      if (bbox && (value < bbox.minLat || value > bbox.maxLat)) {
        return {
          valid: false,
          reason: `latitude ${value} outside ${parkState} bounding box (${bbox.minLat}–${bbox.maxLat})`,
        };
      }
    }
    return { valid: true };
  }

  // --- Longitude ---
  if (fieldName === "longitude") {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return { valid: false, reason: "longitude must be a number" };
    }
    if (value < -180 || value > 180) {
      return { valid: false, reason: `longitude ${value} outside valid range (-180 to 180)` };
    }
    if (parkState) {
      const bbox = STATE_BOUNDING_BOXES[parkState.toUpperCase()];
      if (bbox && (value < bbox.minLng || value > bbox.maxLng)) {
        return {
          valid: false,
          reason: `longitude ${value} outside ${parkState} bounding box (${bbox.minLng}–${bbox.maxLng})`,
        };
      }
    }
    return { valid: true };
  }

  // --- Price fields ---
  if (PRICE_FIELDS.has(fieldName)) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return { valid: false, reason: `${fieldName} must be a number` };
    }
    if (value < 0 || value > 500) {
      return { valid: false, reason: `${fieldName} ${value} outside valid range ($0–$500)` };
    }
    return { valid: true };
  }

  // --- Phone fields ---
  if (PHONE_FIELDS.has(fieldName)) {
    if (typeof value !== "string") {
      return { valid: false, reason: `${fieldName} must be a string` };
    }
    const digitsOnly = value.replace(/\D/g, "");
    if (digitsOnly.length < 10) {
      return {
        valid: false,
        reason: `${fieldName} has only ${digitsOnly.length} digits (minimum 10)`,
      };
    }
    return { valid: true };
  }

  // --- URL fields ---
  if (URL_FIELDS.has(fieldName)) {
    if (typeof value !== "string") {
      return { valid: false, reason: `${fieldName} must be a string` };
    }
    try {
      new URL(value);
    } catch {
      return { valid: false, reason: `${fieldName} is not a valid URL` };
    }
    return { valid: true };
  }

  // --- Positive-quantity fields (trail miles, acres, width, noise limit) ---
  if (POSITIVE_QUANTITY_FIELDS.has(fieldName)) {
    if (typeof value !== "number" || Number.isNaN(value)) {
      return { valid: false, reason: `${fieldName} must be a number` };
    }
    if (value <= 0) {
      return {
        valid: false,
        reason: `${fieldName} ${value} must be greater than 0`,
      };
    }
    return { valid: true };
  }

  // --- Email ---
  if (fieldName === "contactEmail") {
    if (typeof value !== "string") {
      return { valid: false, reason: "contactEmail must be a string" };
    }
    // Basic email check: has @ with a dot somewhere after it
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
      return { valid: false, reason: `contactEmail "${value}" is not a valid email address` };
    }
    return { valid: true };
  }

  // --- All other fields: no additional validation ---
  return { valid: true };
}

/**
 * Strip an accidental city/state/zip tail from a street address so the stored
 * `streetAddress` is just the street line. The LLM sometimes returns a full
 * one-line address (e.g. "123 Main St, Boise, ID 83702") into `streetAddress`,
 * duplicating the separately-extracted city/zip fields.
 *
 * Only strips when the trailing comma-segment clearly looks like city/state/zip,
 * so legitimate street commas ("123 Main St, Suite 4") are left intact.
 */
export function cleanStreetAddress(raw: string): string {
  const trimmed = raw.trim();
  const parts = trimmed
    .split(",")
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length < 2) return trimmed;

  const last = parts[parts.length - 1];
  // Trailing segment ending in a ZIP ("Boise, ID 83702", "Moab 84532", "83702")
  // or a bare 2-letter state abbreviation ("…, Boise, ID") is a location tail.
  const endsWithZip = /\b\d{5}(-\d{4})?$/.test(last);
  const isTrailingState = parts.length >= 3 && /^[A-Za-z]{2}\.?$/.test(last);

  if (endsWithZip || isTrailingState) {
    return parts[0];
  }
  return trimmed;
}
