import { describe, it, expect } from "vitest";
import {
  estimateCost,
  COST_PER_INPUT_TOKEN,
  COST_PER_OUTPUT_TOKEN,
  EXTRACTABLE_FIELDS,
  MAX_CONTENT_CHARS,
  MIN_SOURCES_FOR_NOT_FOUND,
  MAX_SOURCES_PER_SESSION,
} from "@/lib/ai/config";

describe("estimateCost", () => {
  it("should return 0 for zero tokens", () => {
    expect(estimateCost(0, 0)).toBe(0);
  });

  it("should calculate cost based on token counts", () => {
    const inputTokens = 1_000_000;
    const outputTokens = 1_000_000;
    const expected =
      inputTokens * COST_PER_INPUT_TOKEN +
      outputTokens * COST_PER_OUTPUT_TOKEN;
    expect(estimateCost(inputTokens, outputTokens)).toBe(expected);
  });

  it("should handle input-only tokens", () => {
    const cost = estimateCost(1000, 0);
    expect(cost).toBe(1000 * COST_PER_INPUT_TOKEN);
    expect(cost).toBeGreaterThan(0);
  });

  it("should handle output-only tokens", () => {
    const cost = estimateCost(0, 1000);
    expect(cost).toBe(1000 * COST_PER_OUTPUT_TOKEN);
    expect(cost).toBeGreaterThan(0);
  });

  it("output tokens should cost more than input tokens", () => {
    expect(COST_PER_OUTPUT_TOKEN).toBeGreaterThan(COST_PER_INPUT_TOKEN);
  });
});

describe("EXTRACTABLE_FIELDS", () => {
  it("should include all expected scalar fields", () => {
    const expectedScalars = [
      "latitude",
      "longitude",
      "website",
      "phone",
      "isFree",
      "dayPassUSD",
      "milesOfTrails",
      "acres",
      "notes",
      "datesOpen",
      "contactEmail",
      "ownership",
    ];
    for (const field of expectedScalars) {
      expect(EXTRACTABLE_FIELDS).toHaveProperty(field);
    }
  });

  it("should include address fields with dot notation", () => {
    expect(EXTRACTABLE_FIELDS).toHaveProperty("address.streetAddress");
    expect(EXTRACTABLE_FIELDS).toHaveProperty("address.city");
    expect(EXTRACTABLE_FIELDS).toHaveProperty("address.zipCode");
    expect(EXTRACTABLE_FIELDS).toHaveProperty("address.county");
  });

  it("should include array/junction table fields", () => {
    expect(EXTRACTABLE_FIELDS).toHaveProperty("terrain");
    expect(EXTRACTABLE_FIELDS).toHaveProperty("amenities");
    expect(EXTRACTABLE_FIELDS).toHaveProperty("camping");
    expect(EXTRACTABLE_FIELDS).toHaveProperty("vehicleTypes");
  });

  it("should map each field to a type string", () => {
    for (const [, value] of Object.entries(EXTRACTABLE_FIELDS)) {
      expect(typeof value).toBe("string");
      expect(value.length).toBeGreaterThan(0);
    }
  });
});

describe("config constants", () => {
  it("MAX_CONTENT_CHARS should be a reasonable limit", () => {
    expect(MAX_CONTENT_CHARS).toBeGreaterThanOrEqual(10_000);
    expect(MAX_CONTENT_CHARS).toBeLessThanOrEqual(100_000);
  });

  it("MIN_SOURCES_FOR_NOT_FOUND should require multiple sources", () => {
    expect(MIN_SOURCES_FOR_NOT_FOUND).toBeGreaterThanOrEqual(2);
  });

  it("MAX_SOURCES_PER_SESSION should be bounded", () => {
    expect(MAX_SOURCES_PER_SESSION).toBeGreaterThanOrEqual(3);
    expect(MAX_SOURCES_PER_SESSION).toBeLessThanOrEqual(20);
  });
});
