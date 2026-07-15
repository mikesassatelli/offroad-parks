import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV !== "production";

/**
 * Content-Security-Policy (OP-99).
 *
 * Scoped to the app's real client-side resource usage:
 *  - Leaflet loads OSM map tiles (*.tile.openstreetmap.org) and default marker
 *    icons (unpkg.com) directly in the browser.
 *  - The route planner fetches Mapbox directions/geocoding (api.mapbox.com).
 *  - next/image proxies blob + Mapbox images through /_next/image (same-origin).
 *  - Vercel Analytics + the preview toolbar (vercel.live) inject scripts.
 *
 * 'unsafe-inline' is allowed for scripts/styles because Next's hydration
 * bootstrap and next-themes emit inline snippets and we don't yet run a nonce
 * middleware. In development we also permit 'unsafe-eval' and ws: so React
 * Fast Refresh / HMR keep working.
 */
function contentSecurityPolicy(): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "script-src": [
      "'self'",
      "'unsafe-inline'",
      "https://vercel.live",
      ...(isDev ? ["'unsafe-eval'"] : []),
    ],
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": [
      "'self'",
      "data:",
      "blob:",
      "https://*.public.blob.vercel-storage.com",
      "https://api.mapbox.com",
      "https://*.tile.openstreetmap.org",
      "https://unpkg.com",
      "https://lh3.googleusercontent.com",
      "https://vercel.live",
    ],
    "font-src": ["'self'", "data:"],
    "connect-src": [
      "'self'",
      "https://api.mapbox.com",
      "https://vercel.live",
      "wss://*.pusher.com",
      ...(isDev ? ["ws:"] : []),
    ],
    "worker-src": ["'self'", "blob:"],
    "frame-src": ["'self'", "https://vercel.live"],
  };

  const policy = Object.entries(directives)
    .map(([key, values]) => `${key} ${values.join(" ")}`)
    .join("; ");

  // Force HTTPS for any stray http subresources in production.
  return isDev ? policy : `${policy}; upgrade-insecure-requests`;
}

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy() },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
  {
    // Geolocation is allowed for "Parks Near Me"; everything else is denied.
    key: "Permissions-Policy",
    value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=()",
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
        port: "",
        pathname: "/**",
      },
      {
        // Live Mapbox static-image fallback used by ParkMapHero when
        // mapHeroUrl hasn't been generated yet. OP-90.
        protocol: "https",
        hostname: "api.mapbox.com",
        port: "",
        pathname: "/styles/v1/mapbox/**",
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
