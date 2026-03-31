import { fetchMapboxRoute, geocodeLocation } from "@/features/map/utils/routing";
import { vi } from "vitest";

// Mock global fetch
const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

describe("fetchMapboxRoute", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when fewer than 2 waypoints", async () => {
    const result = await fetchMapboxRoute([{ lat: 34, lng: -118 }]);
    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it("should return null when NEXT_PUBLIC_MAPBOX_TOKEN is not set", async () => {
    const original = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

    const result = await fetchMapboxRoute([
      { lat: 34, lng: -118 },
      { lat: 37, lng: -122 },
    ]);

    expect(result).toBeNull();
    expect(mockFetch).not.toHaveBeenCalled();

    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = original;
  });

  it("should return RouteResult on success", async () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "test-token";

    const mockGeometry = {
      type: "LineString",
      coordinates: [
        [-118.2437, 34.0522],
        [-122.4194, 37.7749],
      ],
    };

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        routes: [
          {
            geometry: mockGeometry,
            distance: 612000, // ~380 mi in meters
            duration: 21600, // 360 min
          },
        ],
      }),
    });

    const result = await fetchMapboxRoute([
      { lat: 34.0522, lng: -118.2437 },
      { lat: 37.7749, lng: -122.4194 },
    ]);

    expect(result).not.toBeNull();
    expect(result!.geometry).toEqual(mockGeometry);
    expect(result!.distanceMi).toBeGreaterThan(0);
    expect(result!.durationMin).toBe(360);
  });

  it("should return null when API response is not ok", async () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "test-token";

    mockFetch.mockResolvedValue({ ok: false });

    const result = await fetchMapboxRoute([
      { lat: 34, lng: -118 },
      { lat: 37, lng: -122 },
    ]);

    expect(result).toBeNull();
  });

  it("should return null when no routes in response", async () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "test-token";

    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ routes: [] }),
    });

    const result = await fetchMapboxRoute([
      { lat: 34, lng: -118 },
      { lat: 37, lng: -122 },
    ]);

    expect(result).toBeNull();
  });

  it("should return null on fetch error", async () => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "test-token";

    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await fetchMapboxRoute([
      { lat: 34, lng: -118 },
      { lat: 37, lng: -122 },
    ]);

    expect(result).toBeNull();
  });
});

describe("geocodeLocation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "test-token";
  });

  it("should return null when NEXT_PUBLIC_MAPBOX_TOKEN is not set", async () => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const result = await geocodeLocation("Los Angeles");
    expect(result).toBeNull();
  });

  it("should return location on success", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          {
            place_name: "Los Angeles, California, United States",
            center: [-118.2437, 34.0522],
          },
        ],
      }),
    });

    const result = await geocodeLocation("Los Angeles");

    expect(result).not.toBeNull();
    expect(result!.label).toBe("Los Angeles, California, United States");
    expect(result!.lat).toBe(34.0522);
    expect(result!.lng).toBe(-118.2437);
  });

  it("should return null when no features returned", async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ features: [] }),
    });

    const result = await geocodeLocation("zzzzunknown location");
    expect(result).toBeNull();
  });

  it("should return null on fetch error", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    const result = await geocodeLocation("Los Angeles");
    expect(result).toBeNull();
  });
});
