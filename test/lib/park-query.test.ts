import { vi } from "vitest";
import {
  getParkFacets,
  getParkMarkers,
  getParkPage,
  toMarkerPark,
} from "@/lib/park-query";
import { prisma } from "@/lib/prisma";
import { getBatchParkCardWeather } from "@/lib/weather";
import type { ParkFilterParams } from "@/lib/park-filters";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findMany: vi.fn(),
      count: vi.fn(),
      aggregate: vi.fn(),
    },
    parkAlert: {
      findMany: vi.fn(),
    },
    address: {
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/weather", () => ({
  getBatchParkCardWeather: vi.fn(),
}));

const params: ParkFilterParams = {
  q: "",
  state: undefined,
  terrains: [],
  amenities: [],
  camping: [],
  vehicleTypes: [],
  minTrailMiles: 0,
  minAcres: 0,
  minRating: "",
  ownership: "",
  permitRequired: "",
  membershipRequired: "",
  flagsRequired: "",
  sparkArrestorRequired: "",
  sort: "name",
};

function dbPark(id: string, name: string, extra: Record<string, unknown> = {}) {
  return {
    id,
    slug: id,
    name,
    latitude: 34,
    longitude: -118,
    terrain: [],
    amenities: [],
    camping: [],
    vehicleTypes: [],
    address: { state: "California", city: "LA", latitude: 34, longitude: -118 },
    photos: [],
    trailConditions: [],
    ...extra,
  };
}

describe("getParkPage (offset pagination)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getBatchParkCardWeather).mockResolvedValue(new Map());
    vi.mocked(prisma.parkAlert.findMany).mockResolvedValue([] as never);
  });

  it("returns a decorated page with pagination metadata", async () => {
    vi.mocked(prisma.park.count).mockResolvedValue(30);
    vi.mocked(prisma.park.findMany).mockResolvedValue([
      dbPark("p1", "Park 1"),
      dbPark("p2", "Park 2"),
    ] as never);

    const result = await getParkPage(params, 0, 2);

    expect(result.total).toBe(30);
    expect(result.parks).toHaveLength(2);
    expect(result.parks[0].id).toBe("p1"); // slug used as id
    expect(result.hasMore).toBe(true);
    expect(result.nextPage).toBe(1);
    expect(result.parks[0]).toHaveProperty("todaysRainChance");
  });

  it("uses skip/take derived from the page index", async () => {
    vi.mocked(prisma.park.count).mockResolvedValue(30);
    vi.mocked(prisma.park.findMany).mockResolvedValue([] as never);

    await getParkPage(params, 2, 10);

    expect(prisma.park.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 20, take: 10 }),
    );
  });

  it("reports hasMore=false on the final page", async () => {
    vi.mocked(prisma.park.count).mockResolvedValue(2);
    vi.mocked(prisma.park.findMany).mockResolvedValue([
      dbPark("p1", "Park 1"),
      dbPark("p2", "Park 2"),
    ] as never);

    const result = await getParkPage(params, 0, 24);
    expect(result.hasMore).toBe(false);
    expect(result.nextPage).toBeNull();
  });
});

describe("getParkPage (distance sort)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getBatchParkCardWeather).mockResolvedValue(new Map());
    vi.mocked(prisma.parkAlert.findMany).mockResolvedValue([] as never);
  });

  it("orders by great-circle distance and paginates in JS", async () => {
    // Denver user; LA park is far, Denver park is near, no-coords park last.
    vi.mocked(prisma.park.findMany).mockResolvedValue([
      dbPark("la", "LA Park", { latitude: 34, longitude: -118 }),
      dbPark("den", "Denver Park", { latitude: 39.7, longitude: -104.9 }),
      dbPark("none", "No Coords", { latitude: null, longitude: null }),
    ] as never);

    const result = await getParkPage(
      { ...params, sort: "distance-nearest", userLat: 39.74, userLng: -104.99 },
      0,
      24,
    );

    expect(result.parks.map((p) => p.id)).toEqual(["den", "la", "none"]);
    expect(prisma.park.count).not.toHaveBeenCalled(); // JS path counts in-memory
    expect(result.total).toBe(3);
  });
});

describe("getParkMarkers", () => {
  beforeEach(() => vi.clearAllMocks());

  it("projects rows into lightweight marker parks", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue([
      {
        slug: "p1",
        name: "Park 1",
        latitude: 34,
        longitude: -118,
        isFree: true,
        dayPassUSD: null,
        vehicleEntryFeeUSD: null,
        riderFeeUSD: null,
        membershipFeeUSD: null,
        milesOfTrails: 50,
        acres: 1000,
        address: { city: "LA", state: "California" },
      },
    ] as never);

    const markers = await getParkMarkers(params);
    expect(markers).toHaveLength(1);
    expect(markers[0]).toMatchObject({
      id: "p1",
      name: "Park 1",
      coords: { lat: 34, lng: -118 },
      milesOfTrails: 50,
      acres: 1000,
      terrain: [],
      address: { city: "LA", state: "California" },
    });
  });
});

describe("toMarkerPark", () => {
  it("omits coords when latitude/longitude are missing", () => {
    const park = toMarkerPark({
      slug: "x",
      name: "X",
      latitude: null,
      longitude: null,
      isFree: null,
      dayPassUSD: null,
      vehicleEntryFeeUSD: null,
      riderFeeUSD: null,
      membershipFeeUSD: null,
      milesOfTrails: null,
      acres: null,
      address: null,
    });
    expect(park.coords).toBeUndefined();
    expect(park.address.state).toBe("Unknown");
  });
});

describe("getParkFacets", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns distinct states and slider maxes", async () => {
    vi.mocked(prisma.address.findMany).mockResolvedValue([
      { state: "California" },
      { state: "Colorado" },
    ] as never);
    vi.mocked(prisma.park.aggregate).mockResolvedValue({
      _max: { milesOfTrails: 120, acres: 5000 },
    } as never);

    const facets = await getParkFacets();
    expect(facets.states).toEqual(["California", "Colorado"]);
    expect(facets.maxTrailMiles).toBe(120);
    expect(facets.maxAcres).toBe(5000);
  });

  it("falls back to defaults when there is no data", async () => {
    vi.mocked(prisma.address.findMany).mockResolvedValue([] as never);
    vi.mocked(prisma.park.aggregate).mockResolvedValue({
      _max: { milesOfTrails: null, acres: null },
    } as never);

    const facets = await getParkFacets();
    expect(facets.states).toEqual([]);
    expect(facets.maxTrailMiles).toBe(500);
    expect(facets.maxAcres).toBe(10000);
  });
});
