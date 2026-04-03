import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeUrl, discoverSources } from "@/lib/ai/source-discovery";

describe("normalizeUrl", () => {
  it("should remove trailing slashes", () => {
    expect(normalizeUrl("https://example.com/path/")).toBe(
      "https://example.com/path"
    );
  });

  it("should remove multiple trailing slashes", () => {
    expect(normalizeUrl("https://example.com/path///")).toBe(
      "https://example.com/path"
    );
  });

  it("should preserve root path as /", () => {
    const result = normalizeUrl("https://example.com/");
    expect(result).toBe("https://example.com/");
  });

  it("should strip www prefix", () => {
    expect(normalizeUrl("https://www.example.com/page")).toBe(
      "https://example.com/page"
    );
  });

  it("should remove utm_source tracking parameter", () => {
    expect(
      normalizeUrl("https://example.com/page?utm_source=google&foo=bar")
    ).toBe("https://example.com/page?foo=bar");
  });

  it("should remove utm_medium tracking parameter", () => {
    expect(
      normalizeUrl("https://example.com/page?utm_medium=cpc")
    ).toBe("https://example.com/page");
  });

  it("should remove utm_campaign tracking parameter", () => {
    expect(
      normalizeUrl("https://example.com/page?utm_campaign=spring")
    ).toBe("https://example.com/page");
  });

  it("should remove fbclid tracking parameter", () => {
    expect(
      normalizeUrl("https://example.com/page?fbclid=abc123")
    ).toBe("https://example.com/page");
  });

  it("should remove gclid tracking parameter", () => {
    expect(
      normalizeUrl("https://example.com/page?gclid=xyz789")
    ).toBe("https://example.com/page");
  });

  it("should remove ref tracking parameter", () => {
    expect(
      normalizeUrl("https://example.com/page?ref=twitter")
    ).toBe("https://example.com/page");
  });

  it("should remove multiple tracking parameters at once", () => {
    const url =
      "https://www.example.com/page/?utm_source=google&utm_medium=cpc&utm_campaign=spring&fbclid=abc&real_param=keep";
    const result = normalizeUrl(url);
    expect(result).toBe("https://example.com/page?real_param=keep");
  });

  it("should preserve non-tracking query parameters", () => {
    expect(
      normalizeUrl("https://example.com/search?q=offroad+parks&page=2")
    ).toBe("https://example.com/search?q=offroad+parks&page=2");
  });

  it("should handle URLs with no path", () => {
    expect(normalizeUrl("https://example.com")).toBe(
      "https://example.com/"
    );
  });

  it("should handle URLs with fragments", () => {
    const result = normalizeUrl("https://example.com/page#section");
    expect(result).toContain("example.com/page");
  });

  it("should return the original string for invalid URLs", () => {
    expect(normalizeUrl("not-a-url")).toBe("not-a-url");
    expect(normalizeUrl("")).toBe("");
  });

  it("should handle HTTP URLs", () => {
    expect(normalizeUrl("http://www.example.com/page/")).toBe(
      "http://example.com/page"
    );
  });

  it("should normalize real-world park URLs", () => {
    const url1 = "https://www.bustednudzoffroad.com/trail-info/?utm_source=google";
    const url2 = "https://bustednudzoffroad.com/trail-info";
    expect(normalizeUrl(url1)).toBe(normalizeUrl(url2));
  });
});

describe("discoverSources", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    // Clear env to start clean
    vi.stubEnv("SERPAPI_API_KEY", "");
  });

  it("should return empty array when API key is not set", async () => {
    vi.stubEnv("SERPAPI_API_KEY", "");
    const results = await discoverSources("Test Park", "TX", []);
    expect(results).toEqual([]);
  });

  it("should call SerpApi and return discovered sources", async () => {
    vi.stubEnv("SERPAPI_API_KEY", "test-key");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          organic_results: [
            {
              link: "https://example.com/park",
              title: "Test Park Info",
              displayed_link: "example.com/park",
            },
          ],
        }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const results = await discoverSources("Test Park", "TX", []);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0].url).toBe("https://example.com/park");
    expect(results[0].title).toBe("Test Park Info");
    expect(results[0].type).toBe("website");
  });

  it("should classify .gov domains as governmentPage", async () => {
    vi.stubEnv("SERPAPI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            organic_results: [
              {
                link: "https://blm.gov/park-info",
                title: "BLM Park",
                displayed_link: "blm.gov",
              },
            ],
          }),
      })
    );

    const results = await discoverSources("Test Park", "TX", []);
    expect(results[0].type).toBe("governmentPage");
  });

  it("should classify facebook.com domains", async () => {
    vi.stubEnv("SERPAPI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            organic_results: [
              {
                link: "https://facebook.com/testpark",
                title: "Test Park Facebook",
                displayed_link: "facebook.com",
              },
            ],
          }),
      })
    );

    const results = await discoverSources("Test Park", "TX", []);
    expect(results[0].type).toBe("facebook");
  });

  it("should classify camping directory domains", async () => {
    vi.stubEnv("SERPAPI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            organic_results: [
              {
                link: "https://reserveamerica.com/camping/park",
                title: "Reserve America",
                displayed_link: "reserveamerica.com",
              },
            ],
          }),
      })
    );

    const results = await discoverSources("Test Park", "TX", []);
    expect(results[0].type).toBe("campingDirectory");
  });

  it("should classify recreation.gov as governmentPage (gov takes priority)", async () => {
    vi.stubEnv("SERPAPI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            organic_results: [
              {
                link: "https://recreation.gov/camping/park",
                title: "Recreation.gov",
                displayed_link: "recreation.gov",
              },
            ],
          }),
      })
    );

    const results = await discoverSources("Test Park", "TX", []);
    expect(results[0].type).toBe("governmentPage");
  });

  it("should classify review site domains", async () => {
    vi.stubEnv("SERPAPI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            organic_results: [
              {
                link: "https://alltrails.com/trail/park",
                title: "AllTrails",
                displayed_link: "alltrails.com",
              },
            ],
          }),
      })
    );

    const results = await discoverSources("Test Park", "TX", []);
    expect(results[0].type).toBe("reviewSite");
  });

  it("should exclude already-known URLs", async () => {
    vi.stubEnv("SERPAPI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            organic_results: [
              {
                link: "https://example.com/known",
                title: "Known Source",
                displayed_link: "example.com",
              },
              {
                link: "https://example.com/new",
                title: "New Source",
                displayed_link: "example.com",
              },
            ],
          }),
      })
    );

    const results = await discoverSources("Test Park", "TX", [
      "https://example.com/known",
    ]);
    expect(results).toHaveLength(1);
    expect(results[0].url).toBe("https://example.com/new");
  });

  it("should deduplicate results across queries", async () => {
    vi.stubEnv("SERPAPI_API_KEY", "test-key");
    // Both queries return the same URL
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({
            organic_results: [
              {
                link: "https://example.com/park",
                title: "Same Park",
                displayed_link: "example.com",
              },
            ],
          }),
      })
    );

    const results = await discoverSources("Test Park", "TX", []);
    // Should only appear once despite being returned by both queries
    const urls = results.map((r) => r.url);
    const unique = new Set(urls);
    expect(urls.length).toBe(unique.size);
  });

  it("should return at most 10 results", async () => {
    vi.stubEnv("SERPAPI_API_KEY", "test-key");
    const manyResults = Array.from({ length: 8 }, (_, i) => ({
      link: `https://example${i}.com/park`,
      title: `Park ${i}`,
      displayed_link: `example${i}.com`,
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () =>
          Promise.resolve({ organic_results: manyResults }),
      })
    );

    const results = await discoverSources("Test Park", "TX", []);
    expect(results.length).toBeLessThanOrEqual(10);
  });

  it("should handle SerpApi errors gracefully", async () => {
    vi.stubEnv("SERPAPI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("Network error"))
    );

    const results = await discoverSources("Test Park", "TX", []);
    expect(results).toEqual([]);
  });

  it("should handle non-ok response from SerpApi", async () => {
    vi.stubEnv("SERPAPI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429 })
    );

    const results = await discoverSources("Test Park", "TX", []);
    expect(results).toEqual([]);
  });

  it("should handle missing organic_results in response", async () => {
    vi.stubEnv("SERPAPI_API_KEY", "test-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({}),
      })
    );

    const results = await discoverSources("Test Park", "TX", []);
    expect(results).toEqual([]);
  });
});
