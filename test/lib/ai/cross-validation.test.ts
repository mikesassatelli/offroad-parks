import { describe, it, expect } from "vitest";
import { normalizeValueForComparison } from "@/lib/ai/cross-validation";

describe("normalizeValueForComparison", () => {
  describe("phone normalization", () => {
    it('should match "(555) 123-4567" and "5551234567"', () => {
      const a = normalizeValueForComparison("phone", "(555) 123-4567");
      const b = normalizeValueForComparison("phone", "5551234567");
      expect(a).toBe(b);
    });

    it("should strip all non-digit characters", () => {
      const result = normalizeValueForComparison("phone", "+1 (555) 123-4567");
      expect(result).toBe("15551234567");
    });

    it("should work for campingPhone as well", () => {
      const a = normalizeValueForComparison("campingPhone", "555-123-4567");
      const b = normalizeValueForComparison("campingPhone", "5551234567");
      expect(a).toBe(b);
    });
  });

  describe("URL normalization", () => {
    it("should match URLs with and without www", () => {
      const a = normalizeValueForComparison(
        "website",
        "https://www.example.com/path/"
      );
      const b = normalizeValueForComparison(
        "website",
        "https://example.com/path"
      );
      expect(a).toBe(b);
    });

    it("should strip tracking parameters", () => {
      const a = normalizeValueForComparison(
        "website",
        "https://example.com/page?utm_source=google"
      );
      const b = normalizeValueForComparison(
        "website",
        "https://example.com/page"
      );
      expect(a).toBe(b);
    });

    it("should work for campingWebsite", () => {
      const a = normalizeValueForComparison(
        "campingWebsite",
        "https://www.camping.com/"
      );
      const b = normalizeValueForComparison(
        "campingWebsite",
        "https://camping.com"
      );
      expect(a).toBe(b);
    });
  });

  describe("price (number) comparison", () => {
    it("should match 25.00 and 25", () => {
      const a = normalizeValueForComparison("dayPassUSD", "25.00");
      const b = normalizeValueForComparison("dayPassUSD", "25");
      expect(a).toBe(b);
    });

    it("should round to 2 decimals", () => {
      const result = normalizeValueForComparison("dayPassUSD", "19.999");
      expect(result).toBe("20.00");
    });

    it("should handle integer values", () => {
      const a = normalizeValueForComparison("acres", "500");
      const b = normalizeValueForComparison("acres", "500.00");
      expect(a).toBe(b);
    });
  });

  describe("boolean comparison", () => {
    it("should match true and true", () => {
      const a = normalizeValueForComparison("isFree", "true");
      const b = normalizeValueForComparison("isFree", "true");
      expect(a).toBe(b);
    });

    it("should not match true and false", () => {
      const a = normalizeValueForComparison("isFree", "true");
      const b = normalizeValueForComparison("isFree", "false");
      expect(a).not.toBe(b);
    });

    it('should normalize "yes" to "true"', () => {
      const a = normalizeValueForComparison("permitRequired", "yes");
      const b = normalizeValueForComparison("permitRequired", "true");
      expect(a).toBe(b);
    });

    it('should normalize "1" to "true"', () => {
      const result = normalizeValueForComparison("isFree", "1");
      expect(result).toBe("true");
    });

    it("should handle case insensitivity", () => {
      const a = normalizeValueForComparison("isFree", "True");
      const b = normalizeValueForComparison("isFree", "TRUE");
      expect(a).toBe(b);
      expect(a).toBe("true");
    });
  });

  describe("array (Jaccard) comparison", () => {
    it('should normalize arrays: ["sand", "rocks", "mud"] sorted and lowercased', () => {
      const result = normalizeValueForComparison(
        "terrain",
        JSON.stringify(["sand", "rocks", "mud"])
      );
      // Elements should be sorted
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(["mud", "rocks", "sand"]);
    });

    it("should handle array values with different casing", () => {
      const a = normalizeValueForComparison(
        "amenities",
        JSON.stringify(["Restrooms", "Showers"])
      );
      const b = normalizeValueForComparison(
        "amenities",
        JSON.stringify(["restrooms", "showers"])
      );
      expect(a).toBe(b);
    });

    it("should handle non-JSON array values as plain strings", () => {
      const result = normalizeValueForComparison("terrain", "sand, rocks");
      expect(result).toBe("sand, rocks");
    });
  });

  describe("string case insensitivity", () => {
    it('should match "Open Year-Round" and "open year-round"', () => {
      const a = normalizeValueForComparison("datesOpen", "Open Year-Round");
      const b = normalizeValueForComparison("datesOpen", "open year-round");
      expect(a).toBe(b);
    });

    it("should strip leading and trailing whitespace", () => {
      const a = normalizeValueForComparison("notes", "  Some notes  ");
      const b = normalizeValueForComparison("notes", "Some notes");
      expect(a).toBe(b);
    });
  });

  describe("edge cases", () => {
    it("should handle empty string", () => {
      const result = normalizeValueForComparison("phone", "");
      expect(result).toBe("");
    });

    it("should handle non-numeric value in number field gracefully", () => {
      const result = normalizeValueForComparison("dayPassUSD", "free");
      expect(result).toBe("free");
    });
  });
});
