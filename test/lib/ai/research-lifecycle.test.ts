import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  calculateCompleteness,
  shouldGraduate,
  getCurrentFieldValue,
  getExcludedFields,
} from "@/lib/ai/research-lifecycle";
import { prisma } from "@/lib/prisma";
import type { DbPark } from "@/lib/types";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    fieldExtraction: {
      findMany: vi.fn(),
    },
  },
}));

const mockFindMany = prisma.fieldExtraction.findMany as ReturnType<typeof vi.fn>;

/** Helper to create a minimal DbPark with overrides. */
function makePark(overrides: Partial<DbPark> = {}): DbPark {
  return {
    id: "park-1",
    name: "Test Park",
    slug: "test-park",
    latitude: null,
    longitude: null,
    website: null,
    phone: null,
    campingWebsite: null,
    campingPhone: null,
    isFree: null,
    dayPassUSD: null,
    vehicleEntryFeeUSD: null,
    riderFeeUSD: null,
    membershipFeeUSD: null,
    milesOfTrails: null,
    acres: null,
    notes: null,
    status: "APPROVED",
    operatorId: null,
    dataCompletenessScore: null,
    lastResearchedAt: null,
    researchPriority: 50,
    researchStatus: "NEEDS_RESEARCH",
    submitterId: null,
    submitterName: null,
    averageRating: null,
    averageDifficulty: null,
    averageTerrain: null,
    averageFacilities: null,
    reviewCount: 0,
    averageRecommendedStay: null,
    datesOpen: null,
    contactEmail: null,
    ownership: null,
    permitRequired: null,
    permitType: null,
    membershipRequired: null,
    maxVehicleWidthInches: null,
    flagsRequired: null,
    sparkArrestorRequired: null,
    helmetsRequired: null,
    noiseLimitDBA: null,
    mapHeroUrl: null,
    mapHeroGeneratedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    terrain: [],
    amenities: [],
    camping: [],
    vehicleTypes: [],
    address: {
      id: "addr-1",
      parkId: "park-1",
      streetAddress: null,
      streetAddress2: null,
      city: null,
      state: "TX",
      zipCode: null,
      county: null,
      latitude: null,
      longitude: null,
    },
    ...overrides,
  };
}

describe("calculateCompleteness", () => {
  it("should return 0 for a completely empty park", () => {
    const park = makePark();
    expect(calculateCompleteness(park)).toBe(0);
  });

  it("should return > 0 when some scalar fields are populated", () => {
    const park = makePark({
      latitude: 30.0,
      longitude: -95.0,
      website: "https://example.com",
      phone: "555-1234",
      dayPassUSD: 25,
    });
    const score = calculateCompleteness(park);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });

  it("should count terrain array as populated when non-empty", () => {
    const empty = makePark();
    const withTerrain = makePark({
      terrain: [{ terrain: "sand" }, { terrain: "rocks" }],
    });
    expect(calculateCompleteness(withTerrain)).toBeGreaterThan(
      calculateCompleteness(empty)
    );
  });

  it("should count amenities array as populated when non-empty", () => {
    const empty = makePark();
    const withAmenities = makePark({
      amenities: [{ amenity: "restrooms" }],
    });
    expect(calculateCompleteness(withAmenities)).toBeGreaterThan(
      calculateCompleteness(empty)
    );
  });

  it("should count address fields as populated", () => {
    const empty = makePark();
    const withAddress = makePark({
      address: {
        id: "addr-1",
        parkId: "park-1",
        streetAddress: "123 Main St",
        streetAddress2: null,
        city: "Houston",
        state: "TX",
        zipCode: "77001",
        county: "Harris",
        latitude: null,
        longitude: null,
      },
    });
    expect(calculateCompleteness(withAddress)).toBeGreaterThan(
      calculateCompleteness(empty)
    );
  });

  it("should return 100 when all extractable fields are filled", () => {
    const fullPark = makePark({
      latitude: 30.0,
      longitude: -95.0,
      website: "https://example.com",
      phone: "555-1234",
      campingWebsite: "https://example.com/camp",
      campingPhone: "555-5678",
      isFree: false,
      dayPassUSD: 25,
      vehicleEntryFeeUSD: 10,
      riderFeeUSD: 15,
      membershipFeeUSD: 100,
      milesOfTrails: 50,
      acres: 1000,
      notes: "Great park",
      datesOpen: "Year-round",
      contactEmail: "info@park.com",
      ownership: "private",
      permitRequired: false,
      permitType: null, // This is extractable but nullable, let's set it
      membershipRequired: false,
      maxVehicleWidthInches: 64,
      flagsRequired: true,
      sparkArrestorRequired: true,
      helmetsRequired: true,
      noiseLimitDBA: 96,
      terrain: [{ terrain: "sand" }],
      amenities: [{ amenity: "restrooms" }],
      camping: [{ camping: "tent" }],
      vehicleTypes: [{ vehicleType: "atv" }],
      address: {
        id: "addr-1",
        parkId: "park-1",
        streetAddress: "123 Main",
        streetAddress2: null,
        city: "Houston",
        state: "TX",
        zipCode: "77001",
        county: "Harris",
        latitude: null,
        longitude: null,
      },
    });
    // permitType is null so won't be 100%, set it:
    (fullPark as Record<string, unknown>).permitType = "State OHV Permit";
    expect(calculateCompleteness(fullPark)).toBe(100);
  });

  it("should return a value between 0 and 100", () => {
    const park = makePark({ latitude: 30.0 });
    const score = calculateCompleteness(park);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});

describe("shouldGraduate", () => {
  it("should not graduate an empty park", () => {
    const park = makePark();
    expect(shouldGraduate(park, 0, 0)).toBe(false);
  });

  it("should not graduate with fewer than 3 sources", () => {
    const park = makePark({
      latitude: 30.0,
      longitude: -95.0,
      terrain: [{ terrain: "sand" }],
      vehicleTypes: [{ vehicleType: "atv" }],
      // Fill lots of fields for high completeness
      website: "https://example.com",
      phone: "555-1234",
      dayPassUSD: 25,
      milesOfTrails: 50,
      acres: 1000,
      notes: "Park",
      isFree: false,
      datesOpen: "Year-round",
      contactEmail: "a@b.com",
      ownership: "private",
      permitRequired: false,
      membershipRequired: false,
      flagsRequired: true,
      sparkArrestorRequired: true,
      noiseLimitDBA: 96,
      campingWebsite: "https://a.com",
      campingPhone: "555",
      vehicleEntryFeeUSD: 10,
      riderFeeUSD: 15,
      membershipFeeUSD: 100,
      maxVehicleWidthInches: 64,
    });
    expect(shouldGraduate(park, 20, 2)).toBe(false);
  });

  it("should not graduate without coordinates", () => {
    const park = makePark({
      terrain: [{ terrain: "sand" }],
      vehicleTypes: [{ vehicleType: "atv" }],
      website: "https://example.com",
      phone: "555-1234",
    });
    expect(shouldGraduate(park, 10, 5)).toBe(false);
  });

  it("should not graduate without terrain", () => {
    const park = makePark({
      latitude: 30.0,
      longitude: -95.0,
      vehicleTypes: [{ vehicleType: "atv" }],
    });
    expect(shouldGraduate(park, 10, 5)).toBe(false);
  });

  it("should not graduate without vehicle types", () => {
    const park = makePark({
      latitude: 30.0,
      longitude: -95.0,
      terrain: [{ terrain: "sand" }],
    });
    expect(shouldGraduate(park, 10, 5)).toBe(false);
  });

  it("should graduate a well-populated park with enough sources", () => {
    const park = makePark({
      latitude: 30.0,
      longitude: -95.0,
      website: "https://example.com",
      phone: "555-1234",
      dayPassUSD: 25,
      milesOfTrails: 50,
      acres: 1000,
      notes: "Great park",
      isFree: false,
      datesOpen: "Year-round",
      contactEmail: "a@b.com",
      ownership: "private",
      permitRequired: false,
      membershipRequired: false,
      flagsRequired: true,
      sparkArrestorRequired: true,
      noiseLimitDBA: 96,
      campingWebsite: "https://a.com",
      campingPhone: "555",
      vehicleEntryFeeUSD: 10,
      riderFeeUSD: 15,
      membershipFeeUSD: 100,
      maxVehicleWidthInches: 64,
      terrain: [{ terrain: "sand" }, { terrain: "rocks" }],
      vehicleTypes: [{ vehicleType: "atv" }, { vehicleType: "sxs" }],
      amenities: [{ amenity: "restrooms" }],
      camping: [{ camping: "tent" }],
      address: {
        id: "addr-1",
        parkId: "park-1",
        streetAddress: "123 Main",
        streetAddress2: null,
        city: "Houston",
        state: "TX",
        zipCode: "77001",
        county: "Harris",
        latitude: null,
        longitude: null,
      },
    });
    expect(shouldGraduate(park, 20, 5)).toBe(true);
  });
});

describe("getCurrentFieldValue", () => {
  it("should return null for unpopulated scalar fields", () => {
    const park = makePark();
    expect(getCurrentFieldValue(park, "dayPassUSD")).toBeNull();
    expect(getCurrentFieldValue(park, "phone")).toBeNull();
    expect(getCurrentFieldValue(park, "website")).toBeNull();
  });

  it("should return JSON-encoded value for populated scalar", () => {
    const park = makePark({ dayPassUSD: 25 });
    expect(getCurrentFieldValue(park, "dayPassUSD")).toBe("25");
  });

  it("should return JSON-encoded string for string fields", () => {
    const park = makePark({ phone: "555-1234" });
    expect(getCurrentFieldValue(park, "phone")).toBe('"555-1234"');
  });

  it("should return JSON-encoded boolean", () => {
    const park = makePark({ isFree: true });
    expect(getCurrentFieldValue(park, "isFree")).toBe("true");
  });

  it("should handle false boolean correctly (not null)", () => {
    const park = makePark({ isFree: false });
    expect(getCurrentFieldValue(park, "isFree")).toBe("false");
  });

  it("should return terrain array as JSON", () => {
    const park = makePark({
      terrain: [{ terrain: "sand" }, { terrain: "rocks" }],
    });
    const result = getCurrentFieldValue(park, "terrain");
    expect(result).not.toBeNull();
    expect(JSON.parse(result!)).toEqual(["sand", "rocks"]);
  });

  it("should return null for empty terrain array", () => {
    const park = makePark({ terrain: [] });
    expect(getCurrentFieldValue(park, "terrain")).toBeNull();
  });

  it("should return amenities array as JSON", () => {
    const park = makePark({
      amenities: [{ amenity: "restrooms" }, { amenity: "showers" }],
    });
    const result = getCurrentFieldValue(park, "amenities");
    expect(JSON.parse(result!)).toEqual(["restrooms", "showers"]);
  });

  it("should return camping array as JSON", () => {
    const park = makePark({
      camping: [{ camping: "tent" }],
    });
    const result = getCurrentFieldValue(park, "camping");
    expect(JSON.parse(result!)).toEqual(["tent"]);
  });

  it("should return vehicleTypes array as JSON", () => {
    const park = makePark({
      vehicleTypes: [{ vehicleType: "atv" }, { vehicleType: "sxs" }],
    });
    const result = getCurrentFieldValue(park, "vehicleTypes");
    expect(JSON.parse(result!)).toEqual(["atv", "sxs"]);
  });

  it("should return address sub-fields with dot notation", () => {
    const park = makePark({
      address: {
        id: "addr-1",
        parkId: "park-1",
        streetAddress: "123 Main St",
        streetAddress2: null,
        city: "Houston",
        state: "TX",
        zipCode: "77001",
        county: "Harris",
        latitude: null,
        longitude: null,
      },
    });
    expect(getCurrentFieldValue(park, "address.city")).toBe('"Houston"');
    expect(getCurrentFieldValue(park, "address.zipCode")).toBe('"77001"');
    expect(getCurrentFieldValue(park, "address.streetAddress")).toBe(
      '"123 Main St"'
    );
    expect(getCurrentFieldValue(park, "address.county")).toBe('"Harris"');
  });

  it("should return null for unpopulated address sub-fields", () => {
    const park = makePark();
    expect(getCurrentFieldValue(park, "address.city")).toBeNull();
    expect(getCurrentFieldValue(park, "address.zipCode")).toBeNull();
  });

  it("should return null for address fields when park has no address", () => {
    const park = makePark({ address: null as unknown as DbPark["address"] });
    expect(getCurrentFieldValue(park, "address.city")).toBeNull();
  });
});

describe("getExcludedFields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return field names from approved and not-found extractions", async () => {
    mockFindMany.mockResolvedValue([
      { fieldName: "latitude" },
      { fieldName: "longitude" },
      { fieldName: "phone" },
    ]);

    const result = await getExcludedFields("park-1");
    expect(result).toEqual(["latitude", "longitude", "phone"]);
    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        parkId: "park-1",
        OR: [
          { status: "APPROVED" },
          { confidence: "NOT_FOUND" },
        ],
      },
      select: { fieldName: true },
      distinct: ["fieldName"],
    });
  });

  it("should return empty array when no fields are resolved", async () => {
    mockFindMany.mockResolvedValue([]);
    const result = await getExcludedFields("park-1");
    expect(result).toEqual([]);
  });

  it("should return unique field names", async () => {
    mockFindMany.mockResolvedValue([
      { fieldName: "terrain" },
      { fieldName: "amenities" },
    ]);
    const result = await getExcludedFields("park-1");
    expect(result).toHaveLength(2);
    expect(result).toContain("terrain");
    expect(result).toContain("amenities");
  });
});
