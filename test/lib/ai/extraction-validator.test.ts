import { describe, it, expect } from "vitest";
import { validateExtraction } from "@/lib/ai/extraction-validator";

describe("validateExtraction", () => {
  // ---- Latitude ----
  describe("latitude", () => {
    it("accepts valid latitude within state bounding box", () => {
      const result = validateExtraction("latitude", 34.0, "CA");
      expect(result).toEqual({ valid: true });
    });

    it("rejects latitude outside state bounding box", () => {
      // 47 is well north of Texas (25.8–36.5)
      const result = validateExtraction("latitude", 47.0, "TX");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("outside TX bounding box");
    });

    it("accepts valid latitude with unknown state (just range check)", () => {
      const result = validateExtraction("latitude", 35.0, null);
      expect(result).toEqual({ valid: true });
    });

    it("accepts valid latitude with unrecognized state abbreviation", () => {
      const result = validateExtraction("latitude", 35.0, "XX");
      expect(result).toEqual({ valid: true });
    });

    it("rejects latitude outside global range", () => {
      const result = validateExtraction("latitude", 91.0, null);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("outside valid range");
    });

    it("rejects latitude below -90", () => {
      const result = validateExtraction("latitude", -91.0, null);
      expect(result.valid).toBe(false);
    });

    it("rejects non-numeric latitude", () => {
      const result = validateExtraction("latitude", "34.0", null);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("must be a number");
    });

    it("rejects NaN latitude", () => {
      const result = validateExtraction("latitude", NaN, null);
      expect(result.valid).toBe(false);
    });

    it("accepts latitude at exact boundary of state bbox", () => {
      // CA minLat is 32.5
      const result = validateExtraction("latitude", 32.5, "CA");
      expect(result).toEqual({ valid: true });
    });

    it("handles lowercase state abbreviation", () => {
      const result = validateExtraction("latitude", 34.0, "ca");
      expect(result).toEqual({ valid: true });
    });
  });

  // ---- Longitude ----
  describe("longitude", () => {
    it("accepts valid longitude within state bounding box", () => {
      const result = validateExtraction("longitude", -118.0, "CA");
      expect(result).toEqual({ valid: true });
    });

    it("rejects longitude outside state bounding box", () => {
      // -80 is east coast, far from CA (-124.5 to -114.0)
      const result = validateExtraction("longitude", -80.0, "CA");
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("outside CA bounding box");
    });

    it("accepts valid longitude with null state", () => {
      const result = validateExtraction("longitude", -100.0, null);
      expect(result).toEqual({ valid: true });
    });

    it("rejects longitude outside global range", () => {
      const result = validateExtraction("longitude", 181.0, null);
      expect(result.valid).toBe(false);
    });

    it("rejects longitude below -180", () => {
      const result = validateExtraction("longitude", -181.0, null);
      expect(result.valid).toBe(false);
    });

    it("rejects non-numeric longitude", () => {
      const result = validateExtraction("longitude", "-118", null);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("must be a number");
    });
  });

  // ---- Price fields ----
  describe("price fields", () => {
    const priceFields = [
      "dayPassUSD",
      "vehicleEntryFeeUSD",
      "riderFeeUSD",
      "membershipFeeUSD",
    ];

    for (const field of priceFields) {
      describe(field, () => {
        it("accepts $0", () => {
          expect(validateExtraction(field, 0, null)).toEqual({ valid: true });
        });

        it("accepts $25", () => {
          expect(validateExtraction(field, 25, null)).toEqual({ valid: true });
        });

        it("accepts $500", () => {
          expect(validateExtraction(field, 500, null)).toEqual({ valid: true });
        });

        it("rejects negative price", () => {
          const result = validateExtraction(field, -10, null);
          expect(result.valid).toBe(false);
          expect(result.reason).toContain("outside valid range");
        });

        it("rejects price over $500", () => {
          const result = validateExtraction(field, 1000, null);
          expect(result.valid).toBe(false);
          expect(result.reason).toContain("outside valid range");
        });

        it("rejects non-numeric price", () => {
          const result = validateExtraction(field, "25", null);
          expect(result.valid).toBe(false);
          expect(result.reason).toContain("must be a number");
        });

        it("rejects NaN", () => {
          const result = validateExtraction(field, NaN, null);
          expect(result.valid).toBe(false);
        });
      });
    }
  });

  // ---- Phone fields ----
  describe("phone fields", () => {
    const phoneFields = ["phone", "campingPhone"];

    for (const field of phoneFields) {
      describe(field, () => {
        it("accepts 10-digit phone number", () => {
          const result = validateExtraction(field, "5551234567", null);
          expect(result).toEqual({ valid: true });
        });

        it("accepts formatted phone number with 10+ digits", () => {
          const result = validateExtraction(field, "(555) 123-4567", null);
          expect(result).toEqual({ valid: true });
        });

        it("accepts phone with country code (11 digits)", () => {
          const result = validateExtraction(field, "+1-555-123-4567", null);
          expect(result).toEqual({ valid: true });
        });

        it("rejects 7-digit phone number", () => {
          const result = validateExtraction(field, "5551234", null);
          expect(result.valid).toBe(false);
          expect(result.reason).toContain("7 digits");
          expect(result.reason).toContain("minimum 10");
        });

        it("rejects empty string", () => {
          const result = validateExtraction(field, "", null);
          expect(result.valid).toBe(false);
          expect(result.reason).toContain("0 digits");
        });

        it("rejects non-string", () => {
          const result = validateExtraction(field, 5551234567, null);
          expect(result.valid).toBe(false);
          expect(result.reason).toContain("must be a string");
        });
      });
    }
  });

  // ---- URL fields ----
  describe("URL fields", () => {
    const urlFields = ["website", "campingWebsite"];

    for (const field of urlFields) {
      describe(field, () => {
        it("accepts valid https URL", () => {
          const result = validateExtraction(field, "https://example.com", null);
          expect(result).toEqual({ valid: true });
        });

        it("accepts valid http URL", () => {
          const result = validateExtraction(field, "http://example.com/park", null);
          expect(result).toEqual({ valid: true });
        });

        it("rejects invalid URL (no protocol)", () => {
          const result = validateExtraction(field, "example.com", null);
          expect(result.valid).toBe(false);
          expect(result.reason).toContain("not a valid URL");
        });

        it("rejects random string", () => {
          const result = validateExtraction(field, "not a url at all", null);
          expect(result.valid).toBe(false);
        });

        it("rejects non-string", () => {
          const result = validateExtraction(field, 12345, null);
          expect(result.valid).toBe(false);
          expect(result.reason).toContain("must be a string");
        });
      });
    }
  });

  // ---- Email ----
  describe("contactEmail", () => {
    it("accepts valid email", () => {
      const result = validateExtraction("contactEmail", "info@park.com", null);
      expect(result).toEqual({ valid: true });
    });

    it("accepts email with subdomain", () => {
      const result = validateExtraction("contactEmail", "user@mail.park.org", null);
      expect(result).toEqual({ valid: true });
    });

    it("rejects email without @", () => {
      const result = validateExtraction("contactEmail", "notanemail", null);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("not a valid email");
    });

    it("rejects email without dot after @", () => {
      const result = validateExtraction("contactEmail", "user@nodot", null);
      expect(result.valid).toBe(false);
    });

    it("rejects empty string", () => {
      const result = validateExtraction("contactEmail", "", null);
      expect(result.valid).toBe(false);
    });

    it("rejects non-string", () => {
      const result = validateExtraction("contactEmail", 123, null);
      expect(result.valid).toBe(false);
      expect(result.reason).toContain("must be a string");
    });

    it("rejects email with spaces", () => {
      const result = validateExtraction("contactEmail", "user @park.com", null);
      expect(result.valid).toBe(false);
    });
  });

  // ---- Unknown / other fields ----
  describe("unknown fields", () => {
    it("always passes for unrecognized fields", () => {
      expect(validateExtraction("notes", "some notes", null)).toEqual({ valid: true });
    });

    it("always passes for acres", () => {
      expect(validateExtraction("acres", 500, null)).toEqual({ valid: true });
    });

    it("always passes for isFree", () => {
      expect(validateExtraction("isFree", true, null)).toEqual({ valid: true });
    });

    it("always passes for address.city", () => {
      expect(validateExtraction("address.city", "Denver", null)).toEqual({ valid: true });
    });

    it("passes for terrain array (enum enforcement is Zod's job)", () => {
      expect(validateExtraction("terrain", ["sand", "rocks"], null)).toEqual({ valid: true });
    });
  });

  // ---- Edge cases ----
  describe("edge cases", () => {
    it("latitude at exactly 0 is valid", () => {
      expect(validateExtraction("latitude", 0, null)).toEqual({ valid: true });
    });

    it("longitude at exactly 0 is valid", () => {
      expect(validateExtraction("longitude", 0, null)).toEqual({ valid: true });
    });

    it("latitude at exactly -90 is valid", () => {
      expect(validateExtraction("latitude", -90, null)).toEqual({ valid: true });
    });

    it("longitude at exactly 180 is valid", () => {
      expect(validateExtraction("longitude", 180, null)).toEqual({ valid: true });
    });

    it("price at exactly 0 is valid", () => {
      expect(validateExtraction("dayPassUSD", 0, null)).toEqual({ valid: true });
    });

    it("price at exactly 500 is valid", () => {
      expect(validateExtraction("dayPassUSD", 500, null)).toEqual({ valid: true });
    });

    it("price at 500.01 is invalid", () => {
      const result = validateExtraction("dayPassUSD", 500.01, null);
      expect(result.valid).toBe(false);
    });
  });
});
