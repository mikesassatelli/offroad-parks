import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  lookupGooglePlace,
  placeToFieldValues,
  PLACE_PROVIDED_FIELDS,
  GOOGLE_PLACES_RELIABILITY,
  GOOGLE_PLACES_CONFIDENCE,
  type PlaceData,
} from "@/lib/ai/google-places";

/** Build a minimal Places API result for "Test OHV Park" in Texas. */
function buildApiPlace(overrides: Record<string, unknown> = {}) {
  return {
    id: "place-abc123",
    displayName: { text: "Test OHV Park" },
    location: { latitude: 30.5, longitude: -98.2 },
    addressComponents: [
      { longText: "123", shortText: "123", types: ["street_number"] },
      { longText: "Trail Rd", shortText: "Trail Rd", types: ["route"] },
      { longText: "Austin", shortText: "Austin", types: ["locality"] },
      {
        longText: "Travis County",
        shortText: "Travis County",
        types: ["administrative_area_level_2"],
      },
      {
        longText: "Texas",
        shortText: "TX",
        types: ["administrative_area_level_1"],
      },
      { longText: "78701", shortText: "78701", types: ["postal_code"] },
    ],
    nationalPhoneNumber: "(512) 555-0100",
    websiteUri: "https://testohvpark.com",
    googleMapsUri: "https://maps.google.com/?cid=123",
    businessStatus: "OPERATIONAL",
    ...overrides,
  };
}

function mockFetchOk(body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue({
    ok: true,
    status: 200,
    json: () => Promise.resolve(body),
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("lookupGooglePlace", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
  });

  it("is a silent no-op when the API key is not set", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const result = await lookupGooglePlace("Test OHV Park", "Texas");

    expect(result).toEqual({ place: null, reason: null, apiCalled: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns structured place data on a confident match", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "key");
    mockFetchOk({ places: [buildApiPlace()] });

    const result = await lookupGooglePlace("Test OHV Park", "Texas", "Austin");

    expect(result.apiCalled).toBe(true);
    expect(result.reason).toBeNull();
    expect(result.place).toMatchObject({
      placeId: "place-abc123",
      name: "Test OHV Park",
      latitude: 30.5,
      longitude: -98.2,
      phone: "(512) 555-0100",
      website: "https://testohvpark.com",
      streetAddress: "123 Trail Rd",
      city: "Austin",
      zipCode: "78701",
      county: "Travis", // "County" suffix stripped
      state: "Texas", // normalized from "TX"
      mapsUri: "https://maps.google.com/?cid=123",
      businessStatus: "OPERATIONAL",
    });
  });

  it("sends the API key and a field mask in the request headers", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "secret-key");
    const fetchMock = mockFetchOk({ places: [buildApiPlace()] });

    await lookupGooglePlace("Test OHV Park", "Texas");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toContain("places.googleapis.com");
    expect(init.method).toBe("POST");
    expect(init.headers["X-Goog-Api-Key"]).toBe("secret-key");
    expect(init.headers["X-Goog-FieldMask"]).toContain("places.location");
    const body = JSON.parse(init.body);
    expect(body.textQuery).toBe("Test OHV Park, Texas");
    expect(body.regionCode).toBe("US");
  });

  it("includes the city in the text query when provided", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "key");
    const fetchMock = mockFetchOk({ places: [buildApiPlace()] });

    await lookupGooglePlace("Test OHV Park", "Texas", "Austin");

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.textQuery).toBe("Test OHV Park, Austin, Texas");
  });

  it("rejects a match whose name does not resemble the park (wrong park)", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "key");
    mockFetchOk({
      places: [buildApiPlace({ displayName: { text: "Joe's Diner" } })],
    });

    const result = await lookupGooglePlace("Test OHV Park", "Texas");

    expect(result.place).toBeNull();
    expect(result.apiCalled).toBe(true);
    expect(result.reason).toMatch(/does not match/i);
  });

  it("rejects a match in the wrong state", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "key");
    mockFetchOk({
      places: [
        buildApiPlace({
          addressComponents: [
            {
              longText: "California",
              shortText: "CA",
              types: ["administrative_area_level_1"],
            },
          ],
        }),
      ],
    });

    const result = await lookupGooglePlace("Test OHV Park", "Texas");

    expect(result.place).toBeNull();
    expect(result.reason).toMatch(/California.*but the park is in Texas/i);
  });

  it("rejects a match with no state component (unverifiable)", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "key");
    mockFetchOk({
      places: [buildApiPlace({ addressComponents: [] })],
    });

    const result = await lookupGooglePlace("Test OHV Park", "Texas");

    expect(result.place).toBeNull();
    expect(result.reason).toMatch(/unknown state/i);
  });

  it("returns a reason when no places are found", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "key");
    mockFetchOk({ places: [] });

    const result = await lookupGooglePlace("Test OHV Park", "Texas");

    expect(result.place).toBeNull();
    expect(result.apiCalled).toBe(true);
    expect(result.reason).toMatch(/no google places match/i);
  });

  it("rejects a result missing id or coordinates", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "key");
    mockFetchOk({ places: [buildApiPlace({ location: undefined })] });

    const result = await lookupGooglePlace("Test OHV Park", "Texas");

    expect(result.place).toBeNull();
    expect(result.reason).toMatch(/missing id or coordinates/i);
  });

  it("handles a non-ok API response gracefully", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429 })
    );

    const result = await lookupGooglePlace("Test OHV Park", "Texas");

    expect(result.place).toBeNull();
    expect(result.apiCalled).toBe(true);
    expect(result.reason).toMatch(/429/);
  });

  it("handles a network error gracefully", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("boom"))
    );

    const result = await lookupGooglePlace("Test OHV Park", "Texas");

    expect(result.place).toBeNull();
    expect(result.apiCalled).toBe(true);
    expect(result.reason).toMatch(/request failed.*boom/i);
  });

  it("synthesizes a maps URI when googleMapsUri is absent", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "key");
    mockFetchOk({ places: [buildApiPlace({ googleMapsUri: undefined })] });

    const result = await lookupGooglePlace("Test OHV Park", "Texas");

    expect(result.place?.mapsUri).toBe(
      "https://www.google.com/maps/place/?q=place_id:place-abc123"
    );
  });

  it("leaves optional contact fields null when absent", async () => {
    vi.stubEnv("GOOGLE_PLACES_API_KEY", "key");
    mockFetchOk({
      places: [
        buildApiPlace({
          nationalPhoneNumber: undefined,
          websiteUri: undefined,
        }),
      ],
    });

    const result = await lookupGooglePlace("Test OHV Park", "Texas");

    expect(result.place?.phone).toBeNull();
    expect(result.place?.website).toBeNull();
  });
});

describe("placeToFieldValues", () => {
  const fullPlace: PlaceData = {
    placeId: "p1",
    name: "Test OHV Park",
    mapsUri: "https://maps.google.com/?cid=1",
    latitude: 30.5,
    longitude: -98.2,
    phone: "(512) 555-0100",
    website: "https://testohvpark.com",
    streetAddress: "123 Trail Rd",
    city: "Austin",
    zipCode: "78701",
    county: "Travis",
    state: "Texas",
    businessStatus: "OPERATIONAL",
  };

  it("maps every populated field to the pipeline vocabulary", () => {
    const pairs = placeToFieldValues(fullPlace);
    const byName = Object.fromEntries(
      pairs.map((p) => [p.fieldName, p.value])
    );

    expect(byName).toEqual({
      latitude: 30.5,
      longitude: -98.2,
      phone: "(512) 555-0100",
      website: "https://testohvpark.com",
      "address.streetAddress": "123 Trail Rd",
      "address.city": "Austin",
      "address.zipCode": "78701",
      "address.county": "Travis",
    });
  });

  it("skips fields the listing did not provide", () => {
    const partial: PlaceData = {
      ...fullPlace,
      phone: null,
      website: null,
      streetAddress: null,
      city: null,
      zipCode: null,
      county: null,
    };

    const names = placeToFieldValues(partial).map((p) => p.fieldName);
    expect(names).toEqual(["latitude", "longitude"]);
  });

  it("only emits fields declared in PLACE_PROVIDED_FIELDS", () => {
    const names = placeToFieldValues(fullPlace).map((p) => p.fieldName);
    for (const name of names) {
      expect(PLACE_PROVIDED_FIELDS).toContain(name);
    }
  });
});

describe("constants", () => {
  it("ranks Places above scraped-page defaults", () => {
    expect(GOOGLE_PLACES_RELIABILITY).toBeGreaterThan(90);
    expect(GOOGLE_PLACES_RELIABILITY).toBeLessThanOrEqual(100);
  });

  it("stamps a high confidence score", () => {
    expect(GOOGLE_PLACES_CONFIDENCE).toBeGreaterThan(0.9);
    expect(GOOGLE_PLACES_CONFIDENCE).toBeLessThanOrEqual(1);
  });
});
