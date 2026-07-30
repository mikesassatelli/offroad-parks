import { geocodeQuery, geocodeSuggestions } from "@/lib/geocode-client";
import { vi } from "vitest";

describe("geocodeQuery (location-set flow)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null for an empty query without hitting the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await geocodeQuery("   ")).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("resolves coordinates from the geocode route", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        lat: 39.7392,
        lng: -104.9903,
        placeName: "Denver, Colorado",
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await geocodeQuery("  Denver  ");

    expect(result).toEqual({
      lat: 39.7392,
      lng: -104.9903,
      placeName: "Denver, Colorado",
    });
    expect(fetchMock).toHaveBeenCalledWith("/api/geocode?q=Denver");
  });

  it("returns null on a non-ok response (e.g. 404)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await geocodeQuery("nowhere")).toBeNull();
  });

  it("returns null when the payload lacks numeric coordinates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );
    expect(await geocodeQuery("Denver")).toBeNull();
  });

  it("returns null when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await geocodeQuery("Denver")).toBeNull();
  });
});

describe("geocodeSuggestions (autocomplete flow)", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns an empty array for a <2 char query without hitting the network", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    expect(await geocodeSuggestions("d")).toEqual([]);
    expect(await geocodeSuggestions("  ")).toEqual([]);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("maps suggestions from the geocode route and requests a limit", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        suggestions: [
          { lat: 39.7392, lng: -104.9903, placeName: "Denver, Colorado" },
          { lat: 40.0, lng: -105.0, placeName: "Denver Metro, Colorado" },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const results = await geocodeSuggestions("  Denver  ");

    expect(results).toHaveLength(2);
    expect(results[0]).toEqual({
      lat: 39.7392,
      lng: -104.9903,
      placeName: "Denver, Colorado",
    });
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toBe("/api/geocode?q=Denver&limit=5");
  });

  it("drops entries missing numeric coordinates", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          suggestions: [
            { lat: 39.7, lng: -104.9, placeName: "Good" },
            { placeName: "Bad — no coords" },
          ],
        }),
      }),
    );

    const results = await geocodeSuggestions("Denver");
    expect(results).toEqual([{ lat: 39.7, lng: -104.9, placeName: "Good" }]);
  });

  it("returns an empty array on a non-ok response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));
    expect(await geocodeSuggestions("Denver")).toEqual([]);
  });

  it("returns an empty array when the payload lacks a suggestions array", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
    );
    expect(await geocodeSuggestions("Denver")).toEqual([]);
  });

  it("returns an empty array when fetch rejects", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));
    expect(await geocodeSuggestions("Denver")).toEqual([]);
  });
});
