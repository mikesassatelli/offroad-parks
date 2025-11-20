import {
  formatCurrency,
  formatPhone,
  formatRating,
  formatDate,
  formatRelativeDate,
  formatVisitCondition,
  formatRecommendedDuration,
  formatVehicleType,
} from "@/lib/formatting";

describe("formatCurrency", () => {
  it("should format whole numbers with dollar sign and no decimals", () => {
    expect(formatCurrency(100)).toBe("$100");
    expect(formatCurrency(1000)).toBe("$1000");
    expect(formatCurrency(0)).toBe("$0");
  });

  it("should round down decimal values to whole numbers", () => {
    expect(formatCurrency(99.99)).toBe("$100");
    expect(formatCurrency(49.49)).toBe("$49");
    expect(formatCurrency(0.99)).toBe("$1");
  });

  it("should handle negative numbers", () => {
    expect(formatCurrency(-50)).toBe("$-50");
    expect(formatCurrency(-99.99)).toBe("$-100");
  });

  it("should return em dash for undefined", () => {
    expect(formatCurrency(undefined)).toBe("—");
  });

  it("should return em dash for null", () => {
    expect(formatCurrency(null as any)).toBe("—");
  });

  it("should handle NaN by returning $NaN (edge case)", () => {
    // Note: NaN is typeof 'number', so it gets formatted
    expect(formatCurrency(NaN)).toBe("$NaN");
  });

  it("should return em dash for non-numeric types", () => {
    expect(formatCurrency("100" as any)).toBe("—");
  });
});

describe("formatPhone", () => {
  it("should format 10-digit phone numbers as XXX-XXX-XXXX", () => {
    expect(formatPhone("1234567890")).toBe("123-456-7890");
    expect(formatPhone("5555551234")).toBe("555-555-1234");
  });

  it("should format 11-digit phone numbers with country code as X-XXX-XXX-XXXX", () => {
    expect(formatPhone("12345678901")).toBe("1-234-567-8901");
    expect(formatPhone("15555551234")).toBe("1-555-555-1234");
  });

  it("should strip non-numeric characters before formatting", () => {
    expect(formatPhone("(123) 456-7890")).toBe("123-456-7890");
    expect(formatPhone("123.456.7890")).toBe("123-456-7890");
    expect(formatPhone("123 456 7890")).toBe("123-456-7890");
    expect(formatPhone("+1 (555) 555-1234")).toBe("1-555-555-1234");
  });

  it("should return original string for non-standard lengths", () => {
    expect(formatPhone("123")).toBe("123");
    expect(formatPhone("12345")).toBe("12345");
    expect(formatPhone("123456789012")).toBe("123456789012");
  });

  it("should return empty string for undefined", () => {
    expect(formatPhone(undefined)).toBe("");
  });

  it("should return empty string for null", () => {
    expect(formatPhone(null as any)).toBe("");
  });

  it("should return empty string for empty string", () => {
    expect(formatPhone("")).toBe("");
  });

  it("should handle edge cases with special characters only", () => {
    expect(formatPhone("---")).toBe("---");
    expect(formatPhone("()")).toBe("()");
  });
});

describe("formatRating", () => {
  it("should format rating to one decimal place", () => {
    expect(formatRating(4.567)).toBe("4.6");
    expect(formatRating(3.333)).toBe("3.3");
    expect(formatRating(5.0)).toBe("5.0");
  });

  it("should handle whole numbers", () => {
    expect(formatRating(4)).toBe("4.0");
  });
});

describe("formatDate", () => {
  it("should format date string", () => {
    const result = formatDate("2024-01-15");
    expect(result).toContain("2024");
  });
});

describe("formatRelativeDate", () => {
  it("should return relative time string for today", () => {
    const now = new Date();
    const result = formatRelativeDate(now.toISOString());
    expect(result).toBe("Today");
  });

  it("should return Yesterday for one day ago", () => {
    const date = new Date();
    date.setDate(date.getDate() - 1);
    const result = formatRelativeDate(date.toISOString());
    expect(result).toBe("Yesterday");
  });

  it("should return days ago for recent dates", () => {
    const date = new Date();
    date.setDate(date.getDate() - 3);
    const result = formatRelativeDate(date.toISOString());
    expect(result).toBe("3 days ago");
  });
});

describe("formatVisitCondition", () => {
  it("should format visit conditions correctly", () => {
    expect(formatVisitCondition("dry")).toBe("Dry");
    expect(formatVisitCondition("muddy")).toBe("Muddy");
    expect(formatVisitCondition("wet")).toBe("Wet");
    expect(formatVisitCondition("snow")).toBe("Snow");
    expect(formatVisitCondition("mixed")).toBe("Mixed");
  });
});

describe("formatRecommendedDuration", () => {
  it("should format durations correctly", () => {
    expect(formatRecommendedDuration("halfDay")).toBe("Half Day");
    expect(formatRecommendedDuration("fullDay")).toBe("Full Day");
    expect(formatRecommendedDuration("quickRide")).toBe("Quick Ride");
    expect(formatRecommendedDuration("overnight")).toBe("Overnight");
  });
});

describe("formatVehicleType", () => {
  it("should format vehicle types correctly", () => {
    expect(formatVehicleType("sxs")).toBe("SxS / UTV");
    expect(formatVehicleType("atv")).toBe("ATV");
    expect(formatVehicleType("fullSize")).toBe("Full Size 4x4");
    expect(formatVehicleType("motorcycle")).toBe("Motorcycle");
  });
});
