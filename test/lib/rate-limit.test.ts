import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  checkRateLimit,
  rateLimited,
  __resetRateLimitStore,
} from "@/lib/rate-limit";

const OPTS = { limit: 3, windowMs: 60_000 };

describe("checkRateLimit", () => {
  beforeEach(() => {
    __resetRateLimitStore();
  });

  it("allows requests up to the limit, then blocks", () => {
    const results = [1, 2, 3, 4].map(() => checkRateLimit("user:a", OPTS));
    expect(results.map((r) => r.success)).toEqual([true, true, true, false]);
  });

  it("decrements remaining and reports zero once exhausted", () => {
    expect(checkRateLimit("user:b", OPTS).remaining).toBe(2);
    expect(checkRateLimit("user:b", OPTS).remaining).toBe(1);
    expect(checkRateLimit("user:b", OPTS).remaining).toBe(0);
    expect(checkRateLimit("user:b", OPTS).remaining).toBe(0);
  });

  it("tracks keys independently", () => {
    checkRateLimit("user:c", OPTS);
    checkRateLimit("user:c", OPTS);
    checkRateLimit("user:c", OPTS);
    expect(checkRateLimit("user:c", OPTS).success).toBe(false);
    // A different key starts fresh.
    expect(checkRateLimit("user:d", OPTS).success).toBe(true);
  });

  describe("window reset", () => {
    beforeEach(() => {
      vi.useFakeTimers();
      __resetRateLimitStore();
    });
    afterEach(() => {
      vi.useRealTimers();
    });

    it("resets after the window elapses", () => {
      vi.setSystemTime(0);
      checkRateLimit("user:e", OPTS);
      checkRateLimit("user:e", OPTS);
      checkRateLimit("user:e", OPTS);
      expect(checkRateLimit("user:e", OPTS).success).toBe(false);

      // Advance past the window.
      vi.setSystemTime(OPTS.windowMs + 1);
      const after = checkRateLimit("user:e", OPTS);
      expect(after.success).toBe(true);
      expect(after.remaining).toBe(OPTS.limit - 1);
    });
  });
});

describe("rateLimited", () => {
  it("returns null when the request is within limits", () => {
    expect(
      rateLimited({
        success: true,
        remaining: 2,
        resetAt: 0,
        retryAfterSec: 0,
      }),
    ).toBeNull();
  });

  it("returns a 429 with a Retry-After header when blocked", async () => {
    const res = rateLimited({
      success: false,
      remaining: 0,
      resetAt: 0,
      retryAfterSec: 42,
    });
    expect(res).not.toBeNull();
    expect(res!.status).toBe(429);
    expect(res!.headers.get("Retry-After")).toBe("42");
    const body = await res!.json();
    expect(body.error).toMatch(/too many requests/i);
  });
});
