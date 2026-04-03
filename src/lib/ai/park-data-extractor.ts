import { generateObject } from "ai";
import { EXTRACTION_MODEL } from "./config";
import { type ParkExtraction, buildFilteredSchema } from "./schemas";

type ExtractionResult = {
  extraction: ParkExtraction;
  inputTokens: number;
  outputTokens: number;
};

/**
 * Use an LLM to extract structured park data from web content.
 *
 * @param parkName - The park name to look for in the content
 * @param state - The US state (helps disambiguate similarly named parks)
 * @param sourceContent - Extracted text from a web source
 * @param sourceUrl - URL of the source (included in prompt for context)
 * @param excludeFields - Fields already resolved (APPROVED or NOT_FOUND)
 */
export async function extractParkData(
  parkName: string,
  state: string,
  sourceContent: string,
  sourceUrl: string,
  excludeFields: string[]
): Promise<ExtractionResult> {
  const schema = buildFilteredSchema(excludeFields);

  const systemPrompt = `You are a data extraction specialist for off-road parks and OHV (Off-Highway Vehicle) areas in the United States.

Extract structured data about "${parkName}" in ${state} from the provided web content.

Rules:
- Only extract data explicitly stated in the source content. Do NOT guess or infer values that are not clearly present.
- If a data point is not mentioned in the content, omit that field entirely.
- Map vehicle descriptions to our types: "UTV" or "side-by-side" = "sxs", "4x4" or "Jeep" or "truck" = "fullSize", "quad" or "four-wheeler" = "atv", "dirt bike" = "motorcycle"
- For pricing, extract the most common/standard adult rate. If seasonal pricing exists, use the peak season price.
- For terrain, map descriptions: "sandy" = "sand", "rocky" = "rocks", "wooded trails" or "forest trails" = "trails", "hilly" or "mountain" = "hills", "muddy" or "clay" = "mud"
- For amenities, only include amenities explicitly mentioned. "Full facilities" is too vague to map.
- Confidence scoring:
  - 0.9-1.0: Explicitly and unambiguously stated (e.g., "Day pass: $25")
  - 0.7-0.89: Clearly implied with minor interpretation (e.g., "Fees: Adults $25" → dayPassUSD=25)
  - 0.5-0.69: Reasonable inference from context (e.g., photo shows restroom building → restrooms amenity)
  - Below 0.5: Do not include — too uncertain
- Include a brief source_quote (max 100 chars) showing where you found each value in the source text.
- This content is from: ${sourceUrl}`;

  const result = await generateObject({
    model: EXTRACTION_MODEL,
    schema,
    system: systemPrompt,
    prompt: sourceContent,
  });

  return {
    extraction: result.object as ParkExtraction,
    inputTokens: result.usage?.inputTokens ?? 0,
    outputTokens: result.usage?.outputTokens ?? 0,
  };
}
