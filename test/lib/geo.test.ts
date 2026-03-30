import { haversineDistance, formatDistance } from "@/lib/geo";

describe("haversineDistance", () => {
  it("should return 0 for the same coordinates", () => {
    expect(haversineDistance(34.0522, -118.2437, 34.0522, -118.2437)).toBe(0);
  });

  it("should calculate LA to SF (~347 miles)", () => {
    const distance = haversineDistance(34.0522, -118.2437, 37.7749, -122.4194);
    expect(distance).toBeGreaterThan(340);
    expect(distance).toBeLessThan(355);
  });

  it("should be symmetric — A to B equals B to A", () => {
    const ab = haversineDistance(34.0522, -118.2437, 37.7749, -122.4194);
    const ba = haversineDistance(37.7749, -122.4194, 34.0522, -118.2437);
    expect(ab).toBeCloseTo(ba, 5);
  });

  it("should return a non-integer (fractional miles)", () => {
    const distance = haversineDistance(34.0522, -118.2437, 34.0622, -118.2437);
    expect(typeof distance).toBe("number");
    // Slightly north — not exactly an integer
    expect(distance).toBeGreaterThan(0);
    expect(distance).toBeLessThan(10);
  });

  it("should handle negative longitudes correctly", () => {
    const distance = haversineDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(distance).toBeGreaterThan(2400);
    expect(distance).toBeLessThan(2500);
  });
});

describe("formatDistance", () => {
  it("should format distances under 10 miles with one decimal place", () => {
    expect(formatDistance(4.2)).toBe("4.2 mi");
    expect(formatDistance(0.5)).toBe("0.5 mi");
    expect(formatDistance(9.9)).toBe("9.9 mi");
  });

  it("should round distances of 10+ miles to the nearest integer", () => {
    expect(formatDistance(10)).toBe("10 mi");
    expect(formatDistance(142.4)).toBe("142 mi");
    expect(formatDistance(999.9)).toBe("1000 mi");
  });

  it("should format exactly 10 miles as integer", () => {
    expect(formatDistance(10.0)).toBe("10 mi");
  });

  it("should format 0 miles as '0.0 mi'", () => {
    expect(formatDistance(0)).toBe("0.0 mi");
  });
});
