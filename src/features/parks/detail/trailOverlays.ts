/**
 * Registry mapping a park to a static trail-geometry overlay (GeoJSON in
 * /public). This is the POC bridge for rendering trail *lines* on the park
 * detail Location tab before trail geometry lives in the database
 * (ParkTrailGeometry — see docs/poc/trail-overlay.md).
 *
 * Matched by NAME pattern rather than slug so it is resilient to how a park is
 * slugged in each environment. Point markers (trailheads / rec areas) are NOT
 * here — those are real DB records on the park (`park.mapMarkers`).
 */
export interface TrailOverlayConfig {
  /** Case-insensitive match against the park name. */
  match: RegExp;
  /** Path to a GeoJSON FeatureCollection served from /public. */
  geojsonUrl: string;
  /** Center + zoom used to frame the network on the Location tab. */
  center: [number, number];
  zoom: number;
}

const TRAIL_OVERLAYS: TrailOverlayConfig[] = [
  {
    match: /brock\s*creek/i,
    geojsonUrl: "/poc/brock-creek-trails.geojson",
    center: [35.5143, -92.8117],
    zoom: 13,
  },
  {
    match: /moccasin/i,
    geojsonUrl: "/poc/moccasin-gap-trails.geojson",
    center: [35.5694, -93.1008],
    zoom: 13,
  },
];

export function findTrailOverlay(parkName: string): TrailOverlayConfig | null {
  return TRAIL_OVERLAYS.find((o) => o.match.test(parkName)) ?? null;
}
