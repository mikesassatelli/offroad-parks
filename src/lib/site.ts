/**
 * Canonical, absolute base URL for the site. Used for SEO metadata,
 * sitemap/robots, and any absolute-URL construction (e.g. email links).
 *
 * Resolution order:
 *  1. NEXT_PUBLIC_SITE_URL — set this to the production domain in prod.
 *  2. VERCEL_PROJECT_PRODUCTION_URL — Vercel's stable production hostname.
 *  3. localhost fallback for local dev.
 *
 * No trailing slash.
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_SITE_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : "http://localhost:3000")
).replace(/\/$/, "");
