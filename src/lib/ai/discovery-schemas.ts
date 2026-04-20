import { z } from "zod";
import { normalizeStateName } from "@/lib/us-states";

export const parkCandidateSchema = z.object({
  parks: z.array(
    z.object({
      name: z.string().describe("Official park name"),
      city: z.string().optional().describe("City or town"),
      state: z
        .string()
        .describe(
          "US state — accepts full name ('Arkansas') or 2-letter code ('AR'). Normalized to the full name downstream."
        )
        .transform((raw, ctx) => {
          const normalized = normalizeStateName(raw);
          if (!normalized) {
            ctx.addIssue({
              code: "custom",
              message: `Unknown US state: "${raw}"`,
            });
            return z.NEVER;
          }
          return normalized;
        }),
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
