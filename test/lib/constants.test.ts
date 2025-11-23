import { ALL_AMENITIES, ALL_TERRAIN_TYPES, US_STATES } from "@/lib/constants";

describe("ALL_AMENITIES", () => {
  it("should contain all 19 amenity types", () => {
    expect(ALL_AMENITIES).toHaveLength(19);
  });

  it("should contain expected amenities", () => {
    expect(ALL_AMENITIES).toContain("restrooms");
    expect(ALL_AMENITIES).toContain("showers");
    expect(ALL_AMENITIES).toContain("food");
    expect(ALL_AMENITIES).toContain("fuel");
    expect(ALL_AMENITIES).toContain("repair");
    expect(ALL_AMENITIES).toContain("boatRamp");
    expect(ALL_AMENITIES).toContain("loadingRamp");
    expect(ALL_AMENITIES).toContain("store");
  });

  it("should not have duplicates", () => {
    const unique = new Set(ALL_AMENITIES);
    expect(unique.size).toBe(ALL_AMENITIES.length);
  });
});

describe("ALL_TERRAIN_TYPES", () => {
  it("should contain all 6 terrain types", () => {
    expect(ALL_TERRAIN_TYPES).toHaveLength(6);
  });

  it("should contain expected terrain types", () => {
    expect(ALL_TERRAIN_TYPES).toContain("sand");
    expect(ALL_TERRAIN_TYPES).toContain("rocks");
    expect(ALL_TERRAIN_TYPES).toContain("mud");
    expect(ALL_TERRAIN_TYPES).toContain("trails");
    expect(ALL_TERRAIN_TYPES).toContain("hills");
    expect(ALL_TERRAIN_TYPES).toContain("motocrossTrack");
  });

  it("should not have duplicates", () => {
    const unique = new Set(ALL_TERRAIN_TYPES);
    expect(unique.size).toBe(ALL_TERRAIN_TYPES.length);
  });
});

describe("US_STATES", () => {
  it("should contain all 50 US states", () => {
    expect(US_STATES).toHaveLength(50);
  });

  it("should contain common states", () => {
    expect(US_STATES).toContain("California");
    expect(US_STATES).toContain("Texas");
    expect(US_STATES).toContain("New York");
    expect(US_STATES).toContain("Florida");
  });

  it("should not have duplicates", () => {
    const unique = new Set(US_STATES);
    expect(unique.size).toBe(US_STATES.length);
  });

  it("should be sorted alphabetically", () => {
    const sorted = [...US_STATES].sort();
    expect(US_STATES).toEqual(sorted);
  });
});
