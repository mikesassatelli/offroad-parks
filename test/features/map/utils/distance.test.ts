import { calculateDistance } from "@/features/map/utils/distance";

describe("calculateDistance", () => {
  it("should calculate distance between two points correctly", () => {
    // Los Angeles to San Francisco (approx 347 miles)
    const la = { lat: 34.0522, lng: -118.2437 };
    const sf = { lat: 37.7749, lng: -122.4194 };

    const distance = calculateDistance(la.lat, la.lng, sf.lat, sf.lng);

    // Allow for rounding differences (within 5 miles)
    expect(distance).toBeGreaterThan(340);
    expect(distance).toBeLessThan(355);
  });

  it("should return 0 for the same location", () => {
    const distance = calculateDistance(34.0522, -118.2437, 34.0522, -118.2437);
    expect(distance).toBe(0);
  });

  it("should handle very short distances", () => {
    // Points about 1 mile apart
    const distance = calculateDistance(34.0522, -118.2437, 34.0622, -118.2437);
    expect(distance).toBeGreaterThanOrEqual(0);
    expect(distance).toBeLessThan(10);
  });

  it("should calculate distance between New York and Los Angeles", () => {
    // NYC to LA (approx 2,451 miles)
    const nyc = { lat: 40.7128, lng: -74.006 };
    const la = { lat: 34.0522, lng: -118.2437 };

    const distance = calculateDistance(nyc.lat, nyc.lng, la.lat, la.lng);

    // Allow for rounding differences
    expect(distance).toBeGreaterThan(2400);
    expect(distance).toBeLessThan(2500);
  });

  it("should handle negative longitudes correctly", () => {
    // Both coordinates have negative longitudes (Western hemisphere)
    const distance = calculateDistance(40.7128, -74.006, 34.0522, -118.2437);
    expect(distance).toBeGreaterThan(0);
  });

  it("should handle coordinates across the equator", () => {
    // Northern and Southern hemispheres
    const north = { lat: 40.7128, lng: -74.006 }; // NYC
    const south = { lat: -33.8688, lng: 151.2093 }; // Sydney

    const distance = calculateDistance(
      north.lat,
      north.lng,
      south.lat,
      south.lng,
    );

    // Sydney to NYC is about 9,950 miles
    expect(distance).toBeGreaterThan(9900);
    expect(distance).toBeLessThan(10100);
  });

  it("should handle coordinates across the prime meridian", () => {
    // Western and Eastern hemispheres
    const west = { lat: 40.7128, lng: -74.006 }; // NYC
    const east = { lat: 51.5074, lng: -0.1278 }; // London

    const distance = calculateDistance(west.lat, west.lng, east.lat, east.lng);

    // NYC to London is about 3,459 miles
    expect(distance).toBeGreaterThan(3400);
    expect(distance).toBeLessThan(3500);
  });

  it("should return rounded integer distance", () => {
    const distance = calculateDistance(34.0522, -118.2437, 34.1522, -118.2437);
    expect(Number.isInteger(distance)).toBe(true);
  });

  it("should handle edge case at poles", () => {
    // North pole to equator
    const distance = calculateDistance(90, 0, 0, 0);

    // Should be approximately 1/4 of Earth's circumference (about 6,215 miles)
    expect(distance).toBeGreaterThan(6000);
    expect(distance).toBeLessThan(6300);
  });

  it("should be symmetric (distance A to B equals B to A)", () => {
    const lat1 = 34.0522;
    const lng1 = -118.2437;
    const lat2 = 37.7749;
    const lng2 = -122.4194;

    const distanceAB = calculateDistance(lat1, lng1, lat2, lng2);
    const distanceBA = calculateDistance(lat2, lng2, lat1, lng1);

    expect(distanceAB).toBe(distanceBA);
  });
});
