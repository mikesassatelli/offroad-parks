/**
 * Reusable map-hero visual for parks (OP-90).
 *
 * Renders a Light-sepia USGS-quadrangle style thumbnail for a park.
 * Source priority:
 *   1. `mapHeroUrl` (Vercel Blob, pre-generated at park creation)
 *   2. Live Mapbox static image (fallback when Blob not yet populated)
 *   3. null (caller decides what to render when neither is available)
 *
 * The Light-sepia treatment is applied as a CSS filter here so that the
 * underlying Blob stores the image in its natural Mapbox colors — if we
 * tweak the sepia recipe later, no Blob regeneration is required.
 */
import Image from "next/image";

const MAPBOX_STYLE = "outdoors-v12";
const MAPBOX_ZOOM = 10;
const MAPBOX_WIDTH = 600;
const MAPBOX_HEIGHT = 300;

// Matches the Option 3 "Light sepia" recipe calibrated in the OP-90 demo.
// Dropped multiply-blend fixes the "washed out" feedback; vignette at 0.15.
const SEPIA_FILTER =
  "sepia(0.3) saturate(1.0) contrast(1.03) hue-rotate(-5deg)";
const VIGNETTE_GRADIENT =
  "radial-gradient(ellipse at center, transparent 40%, rgba(139,104,57,0.15) 100%)";

type ParkMapHeroProps = {
  park: {
    id: string;
    name: string;
    address: { city?: string | null; state: string };
    mapHeroUrl?: string | null;
    coords?: { lat: number; lng: number };
  };
  /** "card" = 192px tall (default, matches ParkCard). "hero" = 288px for detail pages. */
  size?: "card" | "hero";
  /** Hide the parchment legend overlay — useful for secondary/inline contexts. */
  hideLegend?: boolean;
};

/**
 * Attempt to produce a live Mapbox static-image URL as a fallback.
 * Returns null when the token isn't set or coords are missing.
 */
function liveMapboxUrl(lat: number | undefined, lng: number | undefined): string | null {
  if (lat == null || lng == null) return null;
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) return null;
  return (
    `https://api.mapbox.com/styles/v1/mapbox/${MAPBOX_STYLE}/static/` +
    `${lng},${lat},${MAPBOX_ZOOM}/` +
    `${MAPBOX_WIDTH}x${MAPBOX_HEIGHT}@2x` +
    `?access_token=${token}`
  );
}

export function ParkMapHero({ park, size = "card", hideLegend = false }: ParkMapHeroProps) {
  const heightClass = size === "hero" ? "h-72" : "h-48";
  const imageUrl =
    park.mapHeroUrl ??
    liveMapboxUrl(park.coords?.lat, park.coords?.lng) ??
    null;

  if (!imageUrl) {
    // No coords, no token. Caller should render its own fallback.
    return null;
  }

  return (
    <div className={`relative ${heightClass} w-full overflow-hidden bg-[#e8dcc0]`}>
      <Image
        src={imageUrl}
        alt={`Map of ${park.name}`}
        fill
        className="object-cover"
        sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        style={{ filter: SEPIA_FILTER }}
        unoptimized={imageUrl.startsWith("https://api.mapbox.com")}
      />
      {/* Vignette — softens edges, ties hero to the parchment legend below */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ background: VIGNETTE_GRADIENT }}
      />
      {!hideLegend && <ParkMapHeroLegend park={park} />}
    </div>
  );
}

/**
 * Parchment legend overlay (USGS-quadrangle treatment).
 * Exported in case a caller wants to render the legend on top of a different
 * surface (e.g. future operator dashboards).
 */
export function ParkMapHeroLegend({
  park,
}: {
  park: {
    name: string;
    address: { city?: string | null; state: string };
    coords?: { lat: number; lng: number };
  };
}) {
  const cityState = park.address.city
    ? `${park.address.city}, ${park.address.state}`
    : park.address.state;
  return (
    <div className="absolute bottom-2 left-3 right-3 z-10">
      <div className="inline-block px-2.5 py-1.5 bg-[#f5ecd6]/92 border border-amber-900/30 font-mono">
        <div className="text-amber-950 text-[11px] font-bold uppercase tracking-wide leading-tight">
          {park.name}
        </div>
        <div className="flex gap-3 mt-1 text-[9px] text-amber-950/70 uppercase tracking-wider">
          <span>{cityState}</span>
          {park.coords && (
            <>
              <span className="text-amber-900/40">│</span>
              <span>
                {park.coords.lat.toFixed(2)}°N{" "}
                {Math.abs(park.coords.lng).toFixed(2)}°W
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
