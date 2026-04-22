/**
 * Park hero image resolution.
 *
 * A park's card hero image can come from three sources, controlled by the
 * `heroSource` column on Park:
 *
 * - `AUTO`  (default) — Use the first APPROVED photo, or null if none (in
 *                       which case callers fall back to the map hero).
 * - `PHOTO`           — Use the specific `heroPhotoId` chosen by the
 *                       operator. If that photo is missing or not APPROVED,
 *                       fall back to AUTO behavior.
 * - `MAP`             — Return null so the card falls back to the map hero
 *                       (`mapHeroUrl` or live `<ParkMapHero>`).
 *
 * The helper accepts a minimal, structural park shape so callers do not have
 * to load the full relation graph — `photos` should be the APPROVED subset
 * (matching the Prisma includes used on the home/profile pages), and
 * `heroPhoto` (if present) should be the specifically selected hero photo.
 */

export type ParkHeroInput = {
  heroSource?: "AUTO" | "PHOTO" | "MAP" | null;
  heroPhotoId?: string | null;
  // Optional: the full heroPhoto relation, if loaded alongside the park.
  heroPhoto?: {
    id: string;
    url: string;
    status: "PENDING" | "APPROVED" | "REJECTED";
  } | null;
  // APPROVED photos list (already filtered). First entry is used for AUTO.
  photos?: Array<{
    id?: string;
    url: string;
    status?: "PENDING" | "APPROVED" | "REJECTED";
  }>;
};

export function resolveParkHeroImage(park: ParkHeroInput): string | null {
  const source = park.heroSource ?? "AUTO";

  if (source === "MAP") {
    // Caller falls back to the map hero (mapHeroUrl or live ParkMapHero).
    return null;
  }

  if (source === "PHOTO" && park.heroPhotoId) {
    // Prefer the loaded relation if available.
    if (park.heroPhoto) {
      if (park.heroPhoto.status === "APPROVED") {
        return park.heroPhoto.url;
      }
      // Selected photo is not APPROVED — fall through to AUTO.
    } else if (park.photos && park.photos.length > 0) {
      // No relation loaded — look up in the APPROVED photos list.
      const match = park.photos.find((p) => p.id === park.heroPhotoId);
      if (match && (match.status === undefined || match.status === "APPROVED")) {
        return match.url;
      }
    }
  }

  // AUTO (or PHOTO fallback): first APPROVED photo, else null.
  const first = park.photos?.[0];
  if (first && (first.status === undefined || first.status === "APPROVED")) {
    return first.url;
  }
  return null;
}
