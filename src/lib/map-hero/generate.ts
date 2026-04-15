/**
 * Map hero generation (OP-90).
 *
 * Fetches a Mapbox static-image tile centered on a park's coords and uploads
 * it to Vercel Blob at `parks/{parkId}/map-hero.jpg`. The image is stored
 * in its natural Mapbox colors — the "Light sepia" CSS treatment is applied
 * by the client when rendering. Storing the unfiltered image means future
 * treatment changes (e.g. tweaking the sepia level) don't require
 * regenerating every Blob.
 *
 * Idempotent: overwrites the same Blob path on each run. Called from:
 *   - park creation (user submit, admin bulk, AI discovery seed)
 *   - park coord updates
 *   - admin backfill endpoint
 */
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";

const MAP_HERO_STYLE = "outdoors-v12";
const MAP_HERO_ZOOM = 10;
const MAP_HERO_WIDTH = 600;
const MAP_HERO_HEIGHT = 300;

export type GenerateMapHeroResult =
  | { ok: true; url: string }
  | { ok: false; reason: string };

/**
 * Generate a map hero for a park, upload to Blob, and persist the URL.
 * Throws only on unexpected errors; expected failure modes (missing token,
 * no coords, park not found, Mapbox error) return `{ ok: false, reason }`.
 */
export async function generateMapHero(parkId: string): Promise<GenerateMapHeroResult> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) {
    return { ok: false, reason: "NEXT_PUBLIC_MAPBOX_TOKEN not set" };
  }

  const park = await prisma.park.findUnique({
    where: { id: parkId },
    select: {
      id: true,
      latitude: true,
      longitude: true,
      address: { select: { latitude: true, longitude: true } },
    },
  });
  if (!park) {
    return { ok: false, reason: "park not found" };
  }

  const lat = park.latitude ?? park.address?.latitude ?? null;
  const lng = park.longitude ?? park.address?.longitude ?? null;
  if (lat == null || lng == null) {
    return { ok: false, reason: "no coordinates" };
  }

  const mapboxUrl =
    `https://api.mapbox.com/styles/v1/mapbox/${MAP_HERO_STYLE}/static/` +
    `${lng},${lat},${MAP_HERO_ZOOM}/` +
    `${MAP_HERO_WIDTH}x${MAP_HERO_HEIGHT}@2x` +
    `?access_token=${token}`;

  const response = await fetch(mapboxUrl);
  if (!response.ok) {
    return { ok: false, reason: `mapbox ${response.status}` };
  }

  const buffer = Buffer.from(await response.arrayBuffer());

  const blob = await put(`parks/${parkId}/map-hero.jpg`, buffer, {
    access: "public",
    contentType: "image/jpeg",
    allowOverwrite: true,
  });

  await prisma.park.update({
    where: { id: parkId },
    data: {
      mapHeroUrl: blob.url,
      mapHeroGeneratedAt: new Date(),
    },
  });

  return { ok: true, url: blob.url };
}

/**
 * Fire-and-forget variant for API route handlers. Errors are logged with
 * a context label; the caller doesn't wait for or act on the result.
 * Park creation and coord-change handlers use this so responses stay fast.
 */
export function generateMapHeroAsync(parkId: string, context: string): void {
  generateMapHero(parkId)
    .then((result) => {
      if (!result.ok) {
        console.warn(
          `[map-hero] Skipped for park ${parkId} (${context}): ${result.reason}`,
        );
      }
    })
    .catch((err) => {
      console.error(
        `[map-hero] Unexpected error for park ${parkId} (${context}):`,
        err,
      );
    });
}
