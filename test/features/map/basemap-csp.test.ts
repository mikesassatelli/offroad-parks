import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { BASEMAPS } from "@/features/map/basemaps";

/**
 * Guards against the regression where a basemap tile host isn't allowed by the
 * Content-Security-Policy `img-src` in next.config.ts — which renders as a gray
 * map in production (dev has no CSP, and direct fetches bypass it, so this only
 * surfaces in prod). Adding a basemap with a new host must also update the CSP.
 */
function cspHostFor(url: string): string {
  // Leaflet substitutes {s} with a subdomain, so a `{s}.host` template maps to
  // the `*.host` CSP wildcard; strip it before parsing the host.
  const host = new URL(url.replace("{s}.", "")).host;
  return url.includes("{s}.") ? `*.${host}` : host;
}

const nextConfigSource = readFileSync(
  resolve(__dirname, "../../../next.config.ts"),
  "utf8",
);

describe("basemap CSP coverage", () => {
  it("allows every basemap tile host in the next.config img-src", () => {
    for (const base of BASEMAPS) {
      const host = cspHostFor(base.url);
      expect(
        nextConfigSource,
        `${base.name} tile host "${host}" must be allow-listed in next.config.ts img-src`,
      ).toContain(host);
    }
  });
});
