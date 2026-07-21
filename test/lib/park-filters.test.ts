import {
  buildParkOrderBy,
  buildParkQueryString,
  buildParkWhere,
  isDistanceSort,
  parkFilterParamsToState,
  parseParkFilterParams,
  searchParamsToURLSearchParams,
  PARK_PAGE_SIZE,
  type ParkFilterParams,
} from "@/lib/park-filters";

const base: ParkFilterParams = {
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

describe("parseParkFilterParams", () => {
  it("returns defaults for an empty query string", () => {
    expect(parseParkFilterParams(new URLSearchParams())).toEqual(base);
  });

  it("parses all supported filters", () => {
    const params = new URLSearchParams(
      "q=%20sand%20&state=California&terrain=sand&terrain=rocks&amenity=fuel&camping=tent&vehicleType=atv&minTrailMiles=25&minAcres=500&minRating=4&ownership=public&permit=yes&membership=no&flags=yes&sparkArrestor=no&sort=rating",
    );
    expect(parseParkFilterParams(params)).toEqual({
      q: "sand",
      state: "California",
      terrains: ["sand", "rocks"],
      amenities: ["fuel"],
      camping: ["tent"],
      vehicleTypes: ["atv"],
      minTrailMiles: 25,
      minAcres: 500,
      minRating: "4",
      ownership: "public",
      permitRequired: "yes",
      membershipRequired: "no",
      flagsRequired: "yes",
      sparkArrestorRequired: "no",
      sort: "rating",
      userLat: undefined,
      userLng: undefined,
    });
  });

  it("supports comma-separated multi-selects", () => {
    const params = new URLSearchParams("terrain=sand,rocks,mud");
    expect(parseParkFilterParams(params).terrains).toEqual([
      "sand",
      "rocks",
      "mud",
    ]);
  });

  it("falls back to name sort for an unknown sort value", () => {
    expect(parseParkFilterParams(new URLSearchParams("sort=bogus")).sort).toBe(
      "name",
    );
  });

  it("parses user coordinates for distance sort", () => {
    const params = parseParkFilterParams(
      new URLSearchParams("sort=distance-nearest&lat=39.7&lng=-104.9"),
    );
    expect(params.userLat).toBe(39.7);
    expect(params.userLng).toBe(-104.9);
  });

  it("ignores non-numeric coordinates and slider values", () => {
    const params = parseParkFilterParams(
      new URLSearchParams("lat=abc&lng=xyz&minTrailMiles=nope"),
    );
    expect(params.userLat).toBeUndefined();
    expect(params.userLng).toBeUndefined();
    expect(params.minTrailMiles).toBe(0);
  });
});

describe("buildParkWhere", () => {
  it("always constrains to APPROVED status", () => {
    const where = buildParkWhere(base);
    expect(where.AND).toContainEqual({ status: "APPROVED" });
  });

  it("builds a case-insensitive OR search across name/notes/city/state", () => {
    const where = buildParkWhere({ ...base, q: "dunes" });
    const search = (where.AND as any[]).find((c) => c.OR);
    expect(search.OR).toEqual([
      { name: { contains: "dunes", mode: "insensitive" } },
      { notes: { contains: "dunes", mode: "insensitive" } },
      { address: { city: { contains: "dunes", mode: "insensitive" } } },
      { address: { state: { contains: "dunes", mode: "insensitive" } } },
    ]);
  });

  it("filters relations with `some ... in`", () => {
    const where = buildParkWhere({
      ...base,
      terrains: ["sand"],
      amenities: ["fuel"],
      camping: ["tent"],
      vehicleTypes: ["atv"],
    });
    const and = where.AND as any[];
    expect(and).toContainEqual({ terrain: { some: { terrain: { in: ["sand"] } } } });
    expect(and).toContainEqual({ amenities: { some: { amenity: { in: ["fuel"] } } } });
    expect(and).toContainEqual({ camping: { some: { camping: { in: ["tent"] } } } });
    expect(and).toContainEqual({
      vehicleTypes: { some: { vehicleType: { in: ["atv"] } } },
    });
  });

  it("applies numeric gte thresholds only when > 0", () => {
    const none = buildParkWhere(base).AND as any[];
    expect(none.some((c) => c.milesOfTrails)).toBe(false);
    expect(none.some((c) => c.acres)).toBe(false);

    const some = buildParkWhere({
      ...base,
      minTrailMiles: 30,
      minAcres: 500,
      minRating: "4",
    }).AND as any[];
    expect(some).toContainEqual({ milesOfTrails: { gte: 30 } });
    expect(some).toContainEqual({ acres: { gte: 500 } });
    expect(some).toContainEqual({ averageRating: { gte: 4 } });
  });

  it("maps tri-state 'yes' to true", () => {
    const and = buildParkWhere({ ...base, permitRequired: "yes" }).AND as any[];
    expect(and).toContainEqual({ permitRequired: true });
  });

  it("maps tri-state 'no' to false OR null (so NULLs are included)", () => {
    const and = buildParkWhere({ ...base, flagsRequired: "no" }).AND as any[];
    expect(and).toContainEqual({
      OR: [{ flagsRequired: false }, { flagsRequired: null }],
    });
  });

  it("filters by exact state and ownership", () => {
    const and = buildParkWhere({
      ...base,
      state: "Colorado",
      ownership: "public",
    }).AND as any[];
    expect(and).toContainEqual({ address: { state: "Colorado" } });
    expect(and).toContainEqual({ ownership: "public" });
  });
});

describe("buildParkOrderBy", () => {
  it("orders by name with an id tiebreaker by default", () => {
    expect(buildParkOrderBy(base)).toEqual([{ name: "asc" }, { id: "asc" }]);
  });

  it("orders price ascending with nulls last", () => {
    expect(buildParkOrderBy({ ...base, sort: "price" })[0]).toEqual({
      dayPassUSD: { sort: "asc", nulls: "last" },
    });
  });

  it("orders miles/acres/rating descending with nulls last", () => {
    expect(buildParkOrderBy({ ...base, sort: "miles" })[0]).toEqual({
      milesOfTrails: { sort: "desc", nulls: "last" },
    });
    expect(buildParkOrderBy({ ...base, sort: "acres" })[0]).toEqual({
      acres: { sort: "desc", nulls: "last" },
    });
    expect(buildParkOrderBy({ ...base, sort: "rating" })[0]).toEqual({
      averageRating: { sort: "desc", nulls: "last" },
    });
  });

  it("orders difficulty in both directions", () => {
    expect(buildParkOrderBy({ ...base, sort: "difficulty-high" })[0]).toEqual({
      averageDifficulty: { sort: "desc", nulls: "last" },
    });
    expect(buildParkOrderBy({ ...base, sort: "difficulty-low" })[0]).toEqual({
      averageDifficulty: { sort: "asc", nulls: "last" },
    });
  });

  it("orders most-reviewed descending", () => {
    expect(buildParkOrderBy({ ...base, sort: "most-reviewed" })[0]).toEqual({
      reviewCount: "desc",
    });
  });

  it("falls back to the name tiebreaker for distance sort", () => {
    expect(buildParkOrderBy({ ...base, sort: "distance-nearest" })).toEqual([
      { name: "asc" },
      { id: "asc" },
    ]);
  });
});

describe("buildParkQueryString", () => {
  it("emits nothing for default state", () => {
    expect(buildParkQueryString({}).toString()).toBe("");
  });

  it("omits the default name sort but keeps other sorts", () => {
    expect(buildParkQueryString({ sortOption: "name" }).toString()).toBe("");
    expect(buildParkQueryString({ sortOption: "rating" }).toString()).toBe(
      "sort=rating",
    );
  });

  it("serialises multi-selects as repeated params", () => {
    const qs = buildParkQueryString({
      selectedTerrains: ["sand", "rocks"],
    }).toString();
    expect(qs).toBe("terrain=sand&terrain=rocks");
  });

  it("round-trips through parse", () => {
    const qs = buildParkQueryString({
      searchQuery: "dunes",
      selectedState: "California",
      selectedTerrains: ["sand"],
      minTrailMiles: 25,
      permitRequired: "yes",
      sortOption: "rating",
    });
    const parsed = parseParkFilterParams(new URLSearchParams(qs.toString()));
    expect(parsed).toMatchObject({
      q: "dunes",
      state: "California",
      terrains: ["sand"],
      minTrailMiles: 25,
      permitRequired: "yes",
      sort: "rating",
    });
  });

  it("only forwards coordinates for distance sort", () => {
    const coords = { lat: 39.7, lng: -104.9 };
    expect(
      buildParkQueryString({ sortOption: "name", userCoords: coords }).has("lat"),
    ).toBe(false);
    const qs = buildParkQueryString({
      sortOption: "distance-nearest",
      userCoords: coords,
    });
    expect(qs.get("lat")).toBe("39.7");
    expect(qs.get("lng")).toBe("-104.9");
  });
});

describe("searchParamsToURLSearchParams", () => {
  it("converts scalar values", () => {
    const params = searchParamsToURLSearchParams({ state: "Arkansas", sort: "rating" });
    expect(params.get("state")).toBe("Arkansas");
    expect(params.get("sort")).toBe("rating");
  });

  it("appends array (repeated) values", () => {
    const params = searchParamsToURLSearchParams({ terrain: ["sand", "rocks"] });
    expect(params.getAll("terrain")).toEqual(["sand", "rocks"]);
  });

  it("skips undefined values", () => {
    const params = searchParamsToURLSearchParams({ state: undefined, sort: "name" });
    expect(params.has("state")).toBe(false);
    expect(params.get("sort")).toBe("name");
  });

  it("round-trips a filtered URL record through parseParkFilterParams", () => {
    const record = { state: "Arkansas", terrain: ["sand", "rocks"], sort: "rating" };
    const parsed = parseParkFilterParams(searchParamsToURLSearchParams(record));
    expect(parsed).toMatchObject({
      state: "Arkansas",
      terrains: ["sand", "rocks"],
      sort: "rating",
    });
  });
});

describe("parkFilterParamsToState", () => {
  it("maps parsed params onto the client Filters-panel state shape", () => {
    const params = parseParkFilterParams(
      new URLSearchParams("q=dunes&state=Arkansas&terrain=sand&minTrailMiles=25&permit=yes&sort=rating"),
    );
    expect(parkFilterParamsToState(params)).toEqual({
      searchQuery: "dunes",
      selectedState: "Arkansas",
      selectedTerrains: ["sand"],
      selectedAmenities: [],
      selectedCamping: [],
      selectedVehicleTypes: [],
      minTrailMiles: 25,
      minAcres: 0,
      minRating: "",
      selectedOwnership: "",
      permitRequired: "yes",
      membershipRequired: "",
      flagsRequired: "",
      sparkArrestorRequired: "",
      sortOption: "rating",
    });
  });
});

describe("misc", () => {
  it("isDistanceSort only matches distance-nearest", () => {
    expect(isDistanceSort("distance-nearest")).toBe(true);
    expect(isDistanceSort("name")).toBe(false);
  });

  it("exposes a page size", () => {
    expect(PARK_PAGE_SIZE).toBeGreaterThan(0);
  });
});
