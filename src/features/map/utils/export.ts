import type { RouteWaypoint } from "@/lib/types";

/**
 * Route export & external-navigation helpers.
 *
 * These build deep links into the Google Maps / Apple Maps apps and produce a
 * downloadable GPX file for offline GPS apps (Gaia GPS, onX Offroad, Avenza,
 * Garmin). Everything here is client-side — no API keys, no metered calls.
 */

type LatLng = { lat: number; lng: number };

/**
 * Google Maps' consumer directions URL accepts at most 9 intermediate
 * waypoints (between origin and destination). Beyond that Maps silently drops
 * the extras, so we cap and report truncation to the caller.
 */
export const MAX_GOOGLE_WAYPOINTS = 9;

const coord = (p: LatLng) => `${p.lat.toFixed(6)},${p.lng.toFixed(6)}`;

/**
 * Build a Google Maps directions deep link for a multi-stop route. Uses the
 * first waypoint as origin, the last as destination, and the middle ones as
 * `waypoints`. Opens the native app on mobile, the web map on desktop.
 *
 * Returns `null` when there are fewer than 2 stops. `truncated` is `true` when
 * the route had more intermediate stops than Google's URL API supports.
 */
export function googleMapsDirectionsUrl(
  waypoints: LatLng[],
): { url: string; truncated: boolean } | null {
  if (waypoints.length < 2) return null;

  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const middle = waypoints.slice(1, -1);
  const included = middle.slice(0, MAX_GOOGLE_WAYPOINTS);

  const params = new URLSearchParams({
    api: "1",
    origin: coord(origin),
    destination: coord(destination),
    travelmode: "driving",
  });
  if (included.length > 0) {
    params.set("waypoints", included.map(coord).join("|"));
  }

  return {
    url: `https://www.google.com/maps/dir/?${params.toString()}`,
    truncated: middle.length > included.length,
  };
}

/** Single-destination Google Maps directions link (from the user's location). */
export function googleMapsDestinationUrl(dest: LatLng): string {
  const params = new URLSearchParams({
    api: "1",
    destination: coord(dest),
    travelmode: "driving",
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/**
 * Build an Apple Maps directions deep link. Apple's URL scheme has no reliable
 * multi-stop support, so a multi-waypoint route is expressed as start → end
 * (intermediate stops are carried by the GPX export instead).
 */
export function appleMapsDirectionsUrl(waypoints: LatLng[]): string | null {
  if (waypoints.length < 2) return null;
  const origin = waypoints[0];
  const destination = waypoints[waypoints.length - 1];
  const params = new URLSearchParams({
    saddr: coord(origin),
    daddr: coord(destination),
    dirflg: "d",
  });
  return `https://maps.apple.com/?${params.toString()}`;
}

/** Single-destination Apple Maps directions link (from the user's location). */
export function appleMapsDestinationUrl(dest: LatLng): string {
  const params = new URLSearchParams({ daddr: coord(dest), dirflg: "d" });
  return `https://maps.apple.com/?${params.toString()}`;
}

/**
 * Best-effort detection of Apple platforms (iOS/iPadOS/macOS) so the UI can
 * lead with Apple Maps. Safe to call on the server — returns `false` when
 * there's no `navigator`.
 */
export function isAppleDevice(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  // iPadOS 13+ reports as "Macintosh"; the touch-point check disambiguates.
  const iPadOS = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  return /iPhone|iPad|iPod/.test(ua) || /Macintosh/.test(ua) || iPadOS;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Serialize a route to GPX 1.1. Named stops become `<wpt>` elements; the
 * road-following track (from the stored GeoJSON `LineString`, or a coarse
 * straight-line fallback across the stops) becomes a `<trk>`.
 */
export function buildRouteGpx(input: {
  title: string;
  waypoints: RouteWaypoint[];
  geometry?: GeoJSON.LineString | null;
}): string {
  const { title, waypoints, geometry } = input;
  const safeTitle = escapeXml(title.trim() || "Offroad Parks route");

  const wpts = waypoints
    .map(
      (w, i) =>
        `  <wpt lat="${w.lat.toFixed(6)}" lon="${w.lng.toFixed(6)}">\n` +
        `    <name>${escapeXml(w.label || `Stop ${i + 1}`)}</name>\n` +
        `  </wpt>`,
    )
    .join("\n");

  // Prefer the real road-following geometry; fall back to the stops themselves.
  const trackPoints: [number, number][] =
    geometry && Array.isArray(geometry.coordinates)
      ? geometry.coordinates.map(([lng, lat]) => [lat, lng])
      : waypoints.map((w) => [w.lat, w.lng]);

  const trkpts = trackPoints
    .map(([lat, lng]) => `      <trkpt lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}"/>`)
    .join("\n");

  return (
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<gpx version="1.1" creator="Offroad Parks" xmlns="http://www.topografix.com/GPX/1/1" ` +
    `xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" ` +
    `xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">\n` +
    `  <metadata>\n    <name>${safeTitle}</name>\n  </metadata>\n` +
    `${wpts}\n` +
    `  <trk>\n    <name>${safeTitle}</name>\n    <trkseg>\n${trkpts}\n    </trkseg>\n  </trk>\n` +
    `</gpx>\n`
  );
}

/** Turn a route title into a safe download filename stem. */
export function toFilenameStem(title: string, fallback = "offroad-parks-route"): string {
  const stem = title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return stem || fallback;
}

/** Trigger a client-side download of a text payload as a file. */
export function downloadTextFile(
  filename: string,
  mimeType: string,
  content: string,
): void {
  if (typeof document === "undefined") return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
