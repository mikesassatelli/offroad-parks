import { geocodeQuery } from "@/lib/geocode-client";
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
