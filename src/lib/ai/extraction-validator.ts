import { STATE_BOUNDING_BOXES } from "./state-bounding-boxes";

export type ValidationResult = {
  valid: boolean;
  reason?: string;
};

const PRICE_FIELDS = new Set([
  "dayPassUSD",
  "vehicleEntryFeeUSD",
  "riderFeeUSD",
  "membershipFeeUSD",
]);

const PHONE_FIELDS = new Set(["phone", "campingPhone"]);

const URL_FIELDS = new Set(["website", "campingWebsite"]);

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
