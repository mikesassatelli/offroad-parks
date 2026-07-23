import { createAnthropic } from "@ai-sdk/anthropic";

export const anthropic = createAnthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

/**
 * Model used for structured data extraction.
 * NOTE: `claude-sonnet-4-20250514` was retired (returns 404) — the whole
 * research pipeline 404'd on every call until this was updated. `claude-sonnet-5`
 * is the current Sonnet and its pricing ($3/$15 per MTok) matches the cost
 * constants below. Bump to `claude-opus-4-8` if extraction accuracy needs it.
 */
export const EXTRACTION_MODEL = anthropic("claude-sonnet-5");

/** Approximate cost per token for cost tracking (Sonnet 5 pricing: $3/$15 per MTok). */
export const COST_PER_INPUT_TOKEN = 3 / 1_000_000;
export const COST_PER_OUTPUT_TOKEN = 15 / 1_000_000;

/** Max content length (in characters) sent to the LLM per source. */
export const MAX_CONTENT_CHARS = 32_000;

/** Minimum sources checked before marking a field NOT_FOUND. */
export const MIN_SOURCES_FOR_NOT_FOUND = 3;

/** Max sources to process per research session. */
export const MAX_SOURCES_PER_SESSION = 5;

// EXTRACTABLE_FIELDS now lives in the side-effect-free park-fields module (so it
// can be shared with client components). Re-exported here for existing importers.
export { EXTRACTABLE_FIELDS } from "./park-fields";

export function estimateCost(
  inputTokens: number,
  outputTokens: number
): number {
  return (
    inputTokens * COST_PER_INPUT_TOKEN + outputTokens * COST_PER_OUTPUT_TOKEN
  );
}
