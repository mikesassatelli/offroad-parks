import { describe, it, expect } from "vitest";
import { parkCandidateSchema } from "@/lib/ai/discovery-schemas";

describe("parkCandidateSchema", () => {
  it("normalizes a canonical full state name unchanged", () => {
    const parsed = parkCandidateSchema.parse({
      parks: [{ name: "Test", state: "Arkansas" }],
    });
    expect(parsed.parks[0].state).toBe("Arkansas");
  });

  it("normalizes a 2-letter code to the full name", () => {
    const parsed = parkCandidateSchema.parse({
      parks: [{ name: "Test", state: "AR" }],
    });
    expect(parsed.parks[0].state).toBe("Arkansas");
  });

  it("normalizes a lowercase full name", () => {
    const parsed = parkCandidateSchema.parse({
      parks: [{ name: "Test", state: "new mexico" }],
    });
    expect(parsed.parks[0].state).toBe("New Mexico");
  });

  it("normalizes a lowercase 2-letter code", () => {
    const parsed = parkCandidateSchema.parse({
      parks: [{ name: "Test", state: "ca" }],
    });
    expect(parsed.parks[0].state).toBe("California");
  });

  it("rejects an unknown state string with a clear message", () => {
    const result = parkCandidateSchema.safeParse({
      parks: [{ name: "Test", state: "Narnia" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join("\n");
      expect(messages).toContain(`Unknown US state: "Narnia"`);
    }
  });

  it("rejects a 2-letter code that is not a US state", () => {
    const result = parkCandidateSchema.safeParse({
      parks: [{ name: "Test", state: "XX" }],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const messages = result.error.issues.map((i) => i.message).join("\n");
      expect(messages).toContain(`Unknown US state: "XX"`);
    }
  });

  it("rejects an empty state string", () => {
    const result = parkCandidateSchema.safeParse({
      parks: [{ name: "Test", state: "" }],
    });
    expect(result.success).toBe(false);
  });

  it("preserves optional fields when provided", () => {
    const parsed = parkCandidateSchema.parse({
      parks: [
        {
          name: "Big Sand Park",
          city: "Moab",
          state: "UT",
          estimatedLat: 38.5,
          estimatedLng: -109.5,
          sourceUrl: "https://example.com/moab",
        },
      ],
    });
    expect(parsed.parks[0]).toEqual({
      name: "Big Sand Park",
      city: "Moab",
      state: "Utah",
      estimatedLat: 38.5,
      estimatedLng: -109.5,
      sourceUrl: "https://example.com/moab",
    });
  });

  it("accepts an empty parks array", () => {
    const parsed = parkCandidateSchema.parse({ parks: [] });
    expect(parsed.parks).toEqual([]);
  });

  it("collects multiple park candidates and normalizes each state", () => {
    const parsed = parkCandidateSchema.parse({
      parks: [
        { name: "A", state: "AR" },
        { name: "B", state: "california" },
        { name: "C", state: "New York" },
      ],
    });
    expect(parsed.parks.map((p) => p.state)).toEqual([
      "Arkansas",
      "California",
      "New York",
    ]);
  });

  it("reports an error for only the invalid candidate when mixed with valid ones", () => {
    const result = parkCandidateSchema.safeParse({
      parks: [
        { name: "A", state: "AR" },
        { name: "B", state: "Narnia" },
        { name: "C", state: "CA" },
      ],
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      // Only the middle park should have an issue; others normalize cleanly.
      const paths = result.error.issues.map((i) => i.path.join("."));
      expect(paths).toEqual(expect.arrayContaining(["parks.1.state"]));
    }
  });
});
