import { generateObject } from "ai";
import { z } from "zod";
import { EXTRACTION_MODEL } from "./config";

const relevanceSchema = z.object({
  isAboutTargetPark: z.boolean(),
  reason: z.string(),
});

/** Max content length sent to the relevance check (cheap validation call). */
const MAX_RELEVANCE_CONTENT_CHARS = 4000;

/**
 * Validates whether web content is primarily about the target park.
 * Returns true if content is relevant, false if it's about a different park.
 */
export async function validateParkRelevance(
  parkName: string,
  state: string,
  contentText: string,
): Promise<{
  isRelevant: boolean;
  reason: string;
  inputTokens: number;
  outputTokens: number;
}> {
  const truncatedContent = contentText.slice(0, MAX_RELEVANCE_CONTENT_CHARS);

  const result = await generateObject({
    model: EXTRACTION_MODEL,
    schema: relevanceSchema,
    system:
      "You are validating whether web page content is primarily about a specific off-road park. Answer based on the content provided.",
    prompt: `Is the following content primarily about '${parkName}' in ${state}? The content may mention other parks — that's fine as long as the primary focus is on the target park. If the content is a directory listing that mentions many parks equally, or is primarily about a different park that just links to the target, answer no.\n\nContent:\n${truncatedContent}`,
  });

  return {
    isRelevant: result.object.isAboutTargetPark,
    reason: result.object.reason,
    inputTokens: result.usage?.inputTokens ?? 0,
    outputTokens: result.usage?.outputTokens ?? 0,
  };
}
