/**
 * Lightweight fixed-window rate limiting for write endpoints (OP-98).
 *
 * Backing store is in-process. NOTE: in a multi-instance serverless deployment
 * each instance keeps its own counters, so the effective global limit scales
 * with instance count. This is adequate as burst/abuse protection for the
 * soft launch; for strict global limits, back `checkRateLimit` with a shared
 * store (e.g. Upstash Redis). The function signature is intentionally
 * backend-agnostic so call sites don't change when that swap happens.
 */
import { NextResponse } from "next/server";

export interface RateLimitOptions {
  /** Max requests allowed within the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
}

export interface RateLimitResult {
  success: boolean;
  /** Requests remaining in the current window. */
  remaining: number;
  /** Epoch ms when the current window resets. */
  resetAt: number;
  /** Seconds until the window resets (for the Retry-After header). */
  retryAfterSec: number;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

const store = new Map<string, WindowEntry>();

// Opportunistic cleanup so the map doesn't grow unbounded with stale keys.
const MAX_KEYS_BEFORE_SWEEP = 10_000;

function sweepExpired(now: number): void {
  for (const [key, entry] of store) {
    if (entry.resetAt <= now) store.delete(key);
  }
}

/**
 * Record a hit against `key` and report whether it is within the limit.
 * Uses a fixed window: the first request starts the window, and the counter
 * resets once `windowMs` elapses.
 */
export function checkRateLimit(
  key: string,
  { limit, windowMs }: RateLimitOptions,
): RateLimitResult {
  const now = Date.now();
  const entry = store.get(key);

  if (!entry || entry.resetAt <= now) {
    if (store.size > MAX_KEYS_BEFORE_SWEEP) sweepExpired(now);
    const resetAt = now + windowMs;
    store.set(key, { count: 1, resetAt });
    return {
      success: true,
      remaining: limit - 1,
      resetAt,
      retryAfterSec: Math.ceil(windowMs / 1000),
    };
  }

  entry.count += 1;
  const retryAfterSec = Math.max(0, Math.ceil((entry.resetAt - now) / 1000));
  return {
    success: entry.count <= limit,
    remaining: Math.max(0, limit - entry.count),
    resetAt: entry.resetAt,
    retryAfterSec,
  };
}

/**
 * Build a 429 response for a failed check, or `null` if the request is within
 * limits. Usage:
 *   const limited = rateLimited(checkRateLimit(key, RATE_LIMITS.reviews));
 *   if (limited) return limited;
 */
export function rateLimited(result: RateLimitResult): NextResponse | null {
  if (result.success) return null;
  return NextResponse.json(
    { error: "Too many requests. Please slow down and try again later." },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterSec) },
    },
  );
}

/** Defaults for user-scoped write endpoints. Keyed per feature. */
export const RATE_LIMITS = {
  /** Reviews are written rarely; one per park, occasional edits. */
  reviews: { limit: 5, windowMs: 60 * 60 * 1000 },
  /** Trail-condition reports: a handful per hour is plenty. */
  conditions: { limit: 10, windowMs: 60 * 60 * 1000 },
  /** Park claims are rare; guard hard against spam. */
  claims: { limit: 5, windowMs: 24 * 60 * 60 * 1000 },
} as const satisfies Record<string, RateLimitOptions>;

/** Test-only: clear the in-memory store between cases. */
export function __resetRateLimitStore(): void {
  store.clear();
}
