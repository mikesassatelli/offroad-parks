import { GET } from "@/app/api/geocode/route";
import { vi } from "vitest";

function req(query = ""): Request {
  return new Request(`http://localhost/api/geocode${query}`);
}

describe("GET /api/geocode", () => {
  const originalToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  beforeEach(() => {
    vi.restoreAllMocks();
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = "test-token";
  });

  afterAll(() => {
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN = originalToken;
  });

  it("400s when the query is missing/blank", async () => {
    const res = await GET(req("?q=%20%20"));
    expect(res.status).toBe(400);
  });

  it("500s when the Mapbox token is not configured", async () => {
    delete process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    const res = await GET(req("?q=Denver"));
    expect(res.status).toBe(500);
  });

  it("returns lat/lng/placeName for a successful geocode", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        features: [
          { center: [-104.9903, 39.7392], place_name: "Denver, Colorado" },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const res = await GET(req("?q=Denver"));
    const data = await res.json();

    expect(res.status).toBe(200);
    expect(data).toEqual({
      lat: 39.7392,
      lng: -104.9903,
      placeName: "Denver, Colorado",
    });
    // Query is URL-encoded and scoped to the US.
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain("mapbox.places/Denver.json");
    expect(calledUrl).toContain("country=us");
    expect(calledUrl).toContain("access_token=test-token");
  });

  it("404s when Mapbox returns no features", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: true, json: async () => ({ features: [] }) }),
    );

    const res = await GET(req("?q=nowhere"));
    expect(res.status).toBe(404);
  });

  it("404s when the upstream request is not ok", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

    const res = await GET(req("?q=Denver"));
    expect(res.status).toBe(404);
  });

  it("500s and logs when fetch throws", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network")));

    const res = await GET(req("?q=Denver"));
    expect(res.status).toBe(500);
    expect(consoleSpy).toHaveBeenCalled();
  });

  describe("suggestions mode (limit > 1)", () => {
    it("returns an array of suggestions and asks Mapbox for autocomplete", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          features: [
            { center: [-104.9903, 39.7392], place_name: "Denver, Colorado" },
            { center: [-105.0, 40.0], place_name: "Denver Metro, Colorado" },
          ],
        }),
      });
      vi.stubGlobal("fetch", fetchMock);

      const res = await GET(req("?q=Denver&limit=5"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.suggestions).toEqual([
        { lat: 39.7392, lng: -104.9903, placeName: "Denver, Colorado" },
        { lat: 40.0, lng: -105.0, placeName: "Denver Metro, Colorado" },
      ]);
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("limit=5");
      expect(calledUrl).toContain("autocomplete=true");
    });

    it("caps the upstream limit at 10", async () => {
      const fetchMock = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ features: [] }),
      });
      vi.stubGlobal("fetch", fetchMock);

      await GET(req("?q=Denver&limit=50"));
      const calledUrl = fetchMock.mock.calls[0][0] as string;
      expect(calledUrl).toContain("limit=10");
    });

    it("degrades to an empty list on an upstream miss instead of 404", async () => {
      vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: false }));

      const res = await GET(req("?q=nowhere&limit=5"));
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.suggestions).toEqual([]);
    });

    it("skips features without coordinates", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            features: [
              { center: [-104.9903, 39.7392], place_name: "Denver, Colorado" },
              { place_name: "No coords" },
            ],
          }),
        }),
      );

      const res = await GET(req("?q=Denver&limit=5"));
      const data = await res.json();
      expect(data.suggestions).toEqual([
        { lat: 39.7392, lng: -104.9903, placeName: "Denver, Colorado" },
      ]);
    });

    it("stays in single-result mode for limit=1", async () => {
      vi.stubGlobal(
        "fetch",
        vi.fn().mockResolvedValue({
          ok: true,
          json: async () => ({
            features: [
              { center: [-104.9903, 39.7392], place_name: "Denver, Colorado" },
            ],
          }),
        }),
      );

      const res = await GET(req("?q=Denver&limit=1"));
      const data = await res.json();
      expect(data).toEqual({
        lat: 39.7392,
        lng: -104.9903,
        placeName: "Denver, Colorado",
      });
      expect(data.suggestions).toBeUndefined();
    });
  });
});
