import { createAnthropic } from "@ai-sdk/anthropic";

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/** Model used for structured data extraction. */
export const EXTRACTION_MODEL = anthropic("claude-sonnet-4-20250514");

/** Approximate cost per token for cost tracking (Sonnet pricing). */
export const COST_PER_INPUT_TOKEN = 3 / 1_000_000;
export const COST_PER_OUTPUT_TOKEN = 15 / 1_000_000;

/** Max content length (in characters) sent to the LLM per source. */
export const MAX_CONTENT_CHARS = 32_000;

/** Minimum sources checked before marking a field NOT_FOUND. */
export const MIN_SOURCES_FOR_NOT_FOUND = 3;

/** Max sources to process per research session. */
export const MAX_SOURCES_PER_SESSION = 5;

/**
 * Park fields that the AI can extract. Maps field name to its value type
 * for display in the admin review UI.
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

export function estimateCost(
  inputTokens: number,
  outputTokens: number
): number {
  return (
    inputTokens * COST_PER_INPUT_TOKEN + outputTokens * COST_PER_OUTPUT_TOKEN
  );
}
