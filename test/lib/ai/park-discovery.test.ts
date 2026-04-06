import { describe, it, expect } from "vitest";
import {
  levenshteinDistance,
  normalizeParkName,
} from "@/lib/ai/park-discovery";

describe("levenshteinDistance", () => {
  it("should return 0 for identical strings", () => {
    expect(levenshteinDistance("hello", "hello")).toBe(0);
  });

  it("should return 0 for two empty strings", () => {
    expect(levenshteinDistance("", "")).toBe(0);
  });

  it("should return length of other string when one is empty", () => {
    expect(levenshteinDistance("", "abc")).toBe(3);
    expect(levenshteinDistance("abc", "")).toBe(3);
  });

  it("should return 1 for a single character difference", () => {
    expect(levenshteinDistance("cat", "bat")).toBe(1);
    expect(levenshteinDistance("cat", "car")).toBe(1);
    expect(levenshteinDistance("cat", "cats")).toBe(1);
  });

  it("should return 2 for two-character differences", () => {
    expect(levenshteinDistance("cat", "bar")).toBe(2);
  });

  it("should return high distance for completely different strings", () => {
    expect(levenshteinDistance("abc", "xyz")).toBe(3);
    expect(levenshteinDistance("hello", "world")).toBeGreaterThanOrEqual(4);
  });

  it("should be symmetric", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(
      levenshteinDistance("sitting", "kitten")
    );
  });

  it("should handle classic kitten/sitting example", () => {
    expect(levenshteinDistance("kitten", "sitting")).toBe(3);
  });
});

describe("normalizeParkName", () => {
  it("should lowercase the name", () => {
    expect(normalizeParkName("Glamis Dunes")).toBe("glamis dunes");
  });

  it("should strip common suffixes like 'park'", () => {
    expect(normalizeParkName("Glamis Dunes Park")).toBe("glamis dunes");
  });

  it("should strip 'off-road' and 'offroad'", () => {
    expect(normalizeParkName("Hollister Hills Off-Road")).toBe(
      "hollister hills"
    );
    expect(normalizeParkName("Hollister Hills Offroad")).toBe(
      "hollister hills"
    );
  });

  it("should strip 'OHV' and 'ATV'", () => {
    expect(normalizeParkName("Pismo Beach OHV")).toBe("pismo beach");
    expect(normalizeParkName("Some ATV Area")).toBe("some");
  });

  it("should strip 'trails' and 'trail'", () => {
    expect(normalizeParkName("Mountain Creek Trails")).toBe("mountain creek");
    expect(normalizeParkName("Pine Trail")).toBe("pine");
  });

  it("should strip 'recreation' and 'recreational'", () => {
    expect(normalizeParkName("Ocotillo Wells Recreation")).toBe(
      "ocotillo wells"
    );
    expect(normalizeParkName("Ocotillo Wells Recreational")).toBe(
      "ocotillo wells"
    );
  });

  it("should strip 'riding' and 'area'", () => {
    expect(normalizeParkName("Clear Creek Riding Area")).toBe("clear creek");
  });

  it("should strip multiple suffixes at once", () => {
    expect(
      normalizeParkName("Hollister Hills OHV Recreation Area")
    ).toBe("hollister hills");
  });

  it("should remove non-alphanumeric characters", () => {
    expect(normalizeParkName("St. Anthony's Sand-Dunes")).toBe(
      "st anthony s sand dunes"
    );
  });

  it("should collapse multiple spaces", () => {
    expect(normalizeParkName("  Glamis   Dunes   Park  ")).toBe(
      "glamis dunes"
    );
  });
});

describe("fuzzy dedup logic", () => {
  it("should detect exact name match after normalization", () => {
    const a = normalizeParkName("Glamis Dunes OHV Park");
    const b = normalizeParkName("Glamis Dunes Off-Road Park");
    expect(a).toBe("glamis dunes");
    expect(b).toBe("glamis dunes");
    expect(levenshteinDistance(a, b)).toBe(0);
  });

  it("should detect near-match within threshold (short names)", () => {
    const a = normalizeParkName("Pismo Beach");
    const b = normalizeParkName("Pismo Bech"); // typo
    const dist = levenshteinDistance(a, b);
    // "pismo beach" vs "pismo bech" — distance should be small
    expect(dist).toBeLessThanOrEqual(3);
  });

  it("should detect near-match within threshold (long names)", () => {
    const a = normalizeParkName("St Anthony Sand Dunes Special Recreation");
    const b = normalizeParkName(
      "Saint Anthony Sand Dunes Special Recreation"
    );
    const normA = normalizeParkName(a);
    const normB = normalizeParkName(b);
    const dist = levenshteinDistance(normA, normB);
    // "st anthony sand dunes" vs "saint anthony sand dunes" — some difference
    // With suffix stripping, these become shorter; distance of ~3 is within the <=5 threshold
    expect(dist).toBeLessThanOrEqual(5);
  });

  it("should NOT match genuinely different parks", () => {
    const a = normalizeParkName("Glamis Dunes");
    const b = normalizeParkName("Pismo Beach");
    const dist = levenshteinDistance(a, b);
    expect(dist).toBeGreaterThan(3);
  });

  it("should catch duplicate with 'OHV' vs no suffix", () => {
    const a = normalizeParkName("Carnegie SVRA OHV Park");
    const b = normalizeParkName("Carnegie SVRA");
    // Both normalize — "ohv" and "park" stripped
    expect(levenshteinDistance(a, b)).toBe(0);
  });
});
