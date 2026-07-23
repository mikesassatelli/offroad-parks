import { describe, it, expect } from "vitest";
import { normalizeForComparison } from "@/lib/ai/research-pipeline";

// A pair "matches" (extraction is treated as a duplicate of the current value)
// when their normalized forms are equal.
const matches = (a: string, b: string, field?: string) =>
  normalizeForComparison(a, field) === normalizeForComparison(b, field);

describe("normalizeForComparison", () => {
  describe("numbers", () => {
    it("treats 25 and 25.0 as equal", () => {
      expect(matches("25", "25.0")).toBe(true);
    });

    it("treats a numeric-typed string like \"$25\" as equal to 25", () => {
      expect(matches('"$25"', "25", "dayPassUSD")).toBe(true);
    });

    it("does not equate different numbers", () => {
      expect(matches("25", "30")).toBe(false);
    });
  });

  describe("phone fields", () => {
    it("ignores formatting differences", () => {
      expect(matches('"(555) 123-4567"', '"5551234567"', "phone")).toBe(true);
    });

    it("respects digit differences", () => {
      expect(matches('"5551234567"', '"5559999999"', "phone")).toBe(false);
    });

    it("does not digit-normalize a non-phone string field", () => {
      // Without the phone field hint, punctuation is preserved.
      expect(matches('"(555) 123-4567"', '"5551234567"')).toBe(false);
    });
  });

  describe("url fields", () => {
    it("ignores scheme, www, and trailing slash", () => {
      expect(
        matches('"http://www.example.com/"', '"https://example.com"', "website")
      ).toBe(true);
    });

    it("ignores tracking params", () => {
      expect(
        matches(
          '"https://example.com/park?utm_source=x"',
          '"https://example.com/park"',
          "website"
        )
      ).toBe(true);
    });

    it("respects genuinely different URLs", () => {
      expect(
        matches('"https://example.com/a"', '"https://example.com/b"', "website")
      ).toBe(false);
    });
  });

  describe("strings", () => {
    it("is case- and whitespace-insensitive", () => {
      expect(matches('"Open  Year-Round"', '"open year-round"')).toBe(true);
    });
  });

  describe("arrays", () => {
    it("is order-insensitive", () => {
      expect(matches('["rocks","sand"]', '["sand","rocks"]', "terrain")).toBe(
        true
      );
    });
  });
});
