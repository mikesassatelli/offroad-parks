import { z } from "zod";

export const parkCandidateSchema = z.object({
  parks: z.array(
    z.object({
      name: z.string().describe("Official park name"),
      city: z.string().optional().describe("City or town"),
      state: z.string().describe("Two-letter state abbreviation"),
      estimatedLat: z
        .number()
        .optional()
        .describe("Approximate latitude if mentioned"),
      estimatedLng: z
        .number()
        .optional()
        .describe("Approximate longitude if mentioned"),
      sourceUrl: z
        .string()
        .optional()
        .describe("URL where this park was found"),
    })
  ),
});

export type DiscoveredParkCandidate = z.infer<
  typeof parkCandidateSchema
>["parks"][number];
