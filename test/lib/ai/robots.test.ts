import { describe, it, expect, vi, beforeEach } from "vitest";
import { isAllowedByRobots, clearRobotsCache } from "@/lib/ai/robots";

describe("robots.txt checker", () => {
  beforeEach(() => {
    clearRobotsCache();
    vi.restoreAllMocks();
  });

  it("should allow URL when robots.txt returns 404", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 404 })
    );
    const allowed = await isAllowedByRobots("https://example.com/some-page");
    expect(allowed).toBe(true);
  });

  it("should allow URL when robots.txt fetch times out", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("timeout"))
    );
    const allowed = await isAllowedByRobots("https://example.com/some-page");
    expect(allowed).toBe(true);
  });

  it("should block URL matching a Disallow path", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(
            "User-agent: *\nDisallow: /private/\nDisallow: /admin\n"
          ),
      })
    );
    expect(
      await isAllowedByRobots("https://example.com/private/data")
    ).toBe(false);
    expect(
      await isAllowedByRobots("https://example.com/admin")
    ).toBe(false);
  });

  it("should allow URLs not matching any Disallow", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve("User-agent: *\nDisallow: /private/\n"),
      })
    );
    expect(
      await isAllowedByRobots("https://example.com/public/page")
    ).toBe(true);
    expect(await isAllowedByRobots("https://example.com/")).toBe(true);
  });

  it("should handle Disallow: / (block everything)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve("User-agent: *\nDisallow: /\n"),
      })
    );
    expect(
      await isAllowedByRobots("https://example.com/anything")
    ).toBe(false);
  });

  it("should only apply rules for User-agent: *", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(
            "User-agent: Googlebot\nDisallow: /secret/\n\nUser-agent: *\nDisallow: /private/\n"
          ),
      })
    );
    // /secret/ is only blocked for Googlebot, not for *
    expect(
      await isAllowedByRobots("https://example.com/secret/page")
    ).toBe(true);
    // /private/ is blocked for *
    expect(
      await isAllowedByRobots("https://example.com/private/page")
    ).toBe(false);
  });

  it("should allow empty Disallow (means allow all)", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve("User-agent: *\nDisallow:\n"),
      })
    );
    expect(
      await isAllowedByRobots("https://example.com/anything")
    ).toBe(true);
  });

  it("should cache robots.txt per origin", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve("User-agent: *\nDisallow: /blocked/\n"),
    });
    vi.stubGlobal("fetch", fetchMock);

    // First call fetches robots.txt
    await isAllowedByRobots("https://example.com/page1");
    // Second call for same origin should use cache
    await isAllowedByRobots("https://example.com/page2");

    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("should fetch separately for different origins", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve("User-agent: *\nDisallow:\n"),
    });
    vi.stubGlobal("fetch", fetchMock);

    await isAllowedByRobots("https://example.com/page");
    await isAllowedByRobots("https://other.com/page");

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("clearRobotsCache should reset the cache", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: () =>
        Promise.resolve("User-agent: *\nDisallow:\n"),
    });
    vi.stubGlobal("fetch", fetchMock);

    await isAllowedByRobots("https://example.com/page");
    expect(fetchMock).toHaveBeenCalledTimes(1);

    clearRobotsCache();

    await isAllowedByRobots("https://example.com/page");
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("should ignore comment lines in robots.txt", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(
            "# This is a comment\nUser-agent: *\n# Another comment\nDisallow: /blocked/\n"
          ),
      })
    );
    expect(
      await isAllowedByRobots("https://example.com/blocked/page")
    ).toBe(false);
    expect(
      await isAllowedByRobots("https://example.com/allowed/page")
    ).toBe(true);
  });

  it("should handle robots.txt with no wildcard agent", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        text: () =>
          Promise.resolve(
            "User-agent: Googlebot\nDisallow: /\n"
          ),
      })
    );
    // No rules for *, so everything is allowed
    expect(
      await isAllowedByRobots("https://example.com/anything")
    ).toBe(true);
  });
});
