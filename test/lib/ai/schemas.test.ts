import { describe, it, expect } from "vitest";
import { parkExtractionSchema, buildFilteredSchema } from "@/lib/ai/schemas";

describe("parkExtractionSchema", () => {
  it("should parse an empty object (all fields optional)", () => {
    const result = parkExtractionSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("should parse a single scalar field", () => {
    const result = parkExtractionSchema.safeParse({
      dayPassUSD: { value: 25, confidence: 0.9, source_quote: "$25 day pass" },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.dayPassUSD?.value).toBe(25);
      expect(result.data.dayPassUSD?.confidence).toBe(0.9);
    }
  });

  it("should parse boolean fields", () => {
    const result = parkExtractionSchema.safeParse({
      isFree: { value: true, confidence: 1.0 },
      permitRequired: { value: false, confidence: 0.8 },
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isFree?.value).toBe(true);
      expect(result.data.permitRequired?.value).toBe(false);
    }
  });

  it("should parse coordinate fields within valid ranges", () => {
    const result = parkExtractionSchema.safeParse({
      latitude: { value: 34.0522, confidence: 0.95 },
      longitude: { value: -118.2437, confidence: 0.95 },
    });
    expect(result.success).toBe(true);
  });

  it("should reject latitude outside valid range", () => {
    const result = parkExtractionSchema.safeParse({
      latitude: { value: 100, confidence: 0.9 },
    });
    expect(result.success).toBe(false);
  });

  it("should reject longitude outside valid range", () => {
    const result = parkExtractionSchema.safeParse({
      longitude: { value: -200, confidence: 0.9 },
    });
    expect(result.success).toBe(false);
  });

  it("should reject confidence below 0", () => {
    const result = parkExtractionSchema.safeParse({
      phone: { value: "555-1234", confidence: -0.1 },
    });
    expect(result.success).toBe(false);
  });

  it("should reject confidence above 1", () => {
    const result = parkExtractionSchema.safeParse({
      phone: { value: "555-1234", confidence: 1.5 },
    });
    expect(result.success).toBe(false);
  });

  it("should parse array fields with valid enum values", () => {
    const result = parkExtractionSchema.safeParse({
      terrain: { value: ["sand", "rocks", "mud"], confidence: 0.85 },
      vehicleTypes: { value: ["atv", "sxs"], confidence: 0.9 },
      amenities: { value: ["restrooms", "fuel"], confidence: 0.7 },
      camping: { value: ["tent", "rv30A"], confidence: 0.8 },
    });
    expect(result.success).toBe(true);
  });

  it("should reject invalid terrain enum values", () => {
    const result = parkExtractionSchema.safeParse({
      terrain: { value: ["sand", "water"], confidence: 0.8 },
    });
    expect(result.success).toBe(false);
  });

  it("should reject invalid vehicle type enum values", () => {
    const result = parkExtractionSchema.safeParse({
      vehicleTypes: { value: ["car"], confidence: 0.8 },
    });
    expect(result.success).toBe(false);
  });

  it("should parse ownership enum correctly", () => {
    for (const val of ["private", "public", "mixed", "unknown"]) {
      const result = parkExtractionSchema.safeParse({
        ownership: { value: val, confidence: 0.9 },
      });
      expect(result.success).toBe(true);
    }
  });

  it("should reject invalid ownership value", () => {
    const result = parkExtractionSchema.safeParse({
      ownership: { value: "federal", confidence: 0.9 },
    });
    expect(result.success).toBe(false);
  });

  it("should reject negative pricing values", () => {
    const result = parkExtractionSchema.safeParse({
      dayPassUSD: { value: -10, confidence: 0.9 },
    });
    expect(result.success).toBe(false);
  });

  it("should allow source_quote to be optional", () => {
    const withQuote = parkExtractionSchema.safeParse({
      phone: { value: "555-1234", confidence: 0.9, source_quote: "Call us" },
    });
    const withoutQuote = parkExtractionSchema.safeParse({
      phone: { value: "555-1234", confidence: 0.9 },
    });
    expect(withQuote.success).toBe(true);
    expect(withoutQuote.success).toBe(true);
  });

  it("should parse a complex multi-field extraction", () => {
    const result = parkExtractionSchema.safeParse({
      latitude: { value: 33.5, confidence: 0.95 },
      longitude: { value: -112.1, confidence: 0.95 },
      dayPassUSD: { value: 15, confidence: 0.9 },
      isFree: { value: false, confidence: 1.0 },
      terrain: { value: ["sand", "hills"], confidence: 0.85 },
      vehicleTypes: { value: ["atv", "motorcycle", "sxs"], confidence: 0.9 },
      city: { value: "Phoenix", confidence: 0.9 },
      notes: {
        value: "Great desert riding area",
        confidence: 0.7,
        source_quote: "a great desert riding area open year round",
      },
    });
    expect(result.success).toBe(true);
  });
});

describe("buildFilteredSchema", () => {
  it("should return all fields when no exclusions", () => {
    const schema = buildFilteredSchema([]);
    const result = schema.safeParse({});
    expect(result.success).toBe(true);
    // Should still accept all fields
    const fullResult = schema.safeParse({
      latitude: { value: 34.0, confidence: 0.9 },
    });
    expect(fullResult.success).toBe(true);
  });

  it("should exclude specified scalar fields", () => {
    const schema = buildFilteredSchema(["latitude", "longitude", "phone"]);
    const shape = schema.shape;
    expect(shape).not.toHaveProperty("latitude");
    expect(shape).not.toHaveProperty("longitude");
    expect(shape).not.toHaveProperty("phone");
    // Other fields should still be present
    expect(shape).toHaveProperty("dayPassUSD");
    expect(shape).toHaveProperty("website");
  });

  it("should handle address fields with dot notation", () => {
    const schema = buildFilteredSchema(["address.city", "address.zipCode"]);
    const shape = schema.shape;
    expect(shape).not.toHaveProperty("city");
    expect(shape).not.toHaveProperty("zipCode");
    // Other address fields should remain
    expect(shape).toHaveProperty("streetAddress");
    expect(shape).toHaveProperty("county");
  });

  it("should exclude array fields", () => {
    const schema = buildFilteredSchema(["terrain", "amenities"]);
    const shape = schema.shape;
    expect(shape).not.toHaveProperty("terrain");
    expect(shape).not.toHaveProperty("amenities");
    expect(shape).toHaveProperty("camping");
    expect(shape).toHaveProperty("vehicleTypes");
  });

  it("should return a valid Zod schema that parses data", () => {
    const schema = buildFilteredSchema(["latitude", "longitude"]);
    const result = schema.safeParse({
      dayPassUSD: { value: 25, confidence: 0.9 },
    });
    expect(result.success).toBe(true);
  });

  it("should handle excluding all fields", () => {
    const allFields = Object.keys(parkExtractionSchema.shape).map((key) => {
      const addressFields = ["streetAddress", "city", "zipCode", "county"];
      return addressFields.includes(key) ? `address.${key}` : key;
    });
    const schema = buildFilteredSchema(allFields);
    expect(Object.keys(schema.shape).length).toBe(0);
  });
});
