import { formatCurrency, formatPhone } from "@/lib/formatting";

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
