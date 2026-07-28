"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Download, Navigation } from "lucide-react";
import type { RouteWaypoint } from "@/lib/types";
import {
  appleMapsDirectionsUrl,
  buildRouteGpx,
  downloadTextFile,
  googleMapsDirectionsUrl,
  MAX_GOOGLE_WAYPOINTS,
  toFilenameStem,
} from "@/features/map/utils/export";

interface RouteExportControlsProps {
  waypoints: RouteWaypoint[];
  routeGeometry?: GeoJSON.LineString | null;
  /** Route name, used for the GPX filename and metadata. */
  title?: string;
}

/**
 * "Navigate & Export" controls for a built route: open the full multi-stop
 * route in Google Maps, open it (start → end) in Apple Maps, or download a GPX
 * for offline GPS apps (Gaia GPS, onX Offroad, Avenza, Garmin).
 *
 * All actions are client-side deep links / file generation — no API keys and
 * no metered requests. Renders nothing for routes with fewer than 2 stops.
 */
export function RouteExportControls({
  waypoints,
  routeGeometry,
  title,
}: RouteExportControlsProps) {
  const google = useMemo(() => googleMapsDirectionsUrl(waypoints), [waypoints]);
  const apple = useMemo(() => appleMapsDirectionsUrl(waypoints), [waypoints]);

  if (waypoints.length < 2 || !google || !apple) return null;

  const handleDownloadGpx = () => {
    const name = title?.trim() || "Offroad Parks route";
    const gpx = buildRouteGpx({ title: name, waypoints, geometry: routeGeometry });
    downloadTextFile(`${toFilenameStem(name)}.gpx`, "application/gpx+xml", gpx);
  };

  return (
    <div className="mt-4 pt-4 border-t">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-3">
        Navigate &amp; Export
      </p>
      <div className="space-y-2">
        <Button
          asChild
          variant="default"
          size="sm"
          className="w-full"
        >
          <a href={google.url} target="_blank" rel="noopener noreferrer">
            <Navigation className="w-3 h-3 mr-1" />
            Open in Google Maps
          </a>
        </Button>
        <Button asChild variant="outline" size="sm" className="w-full">
          <a href={apple} target="_blank" rel="noopener noreferrer">
            <Navigation className="w-3 h-3 mr-1" />
            Open in Apple Maps
          </a>
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="w-full"
          onClick={handleDownloadGpx}
        >
          <Download className="w-3 h-3 mr-1" />
          Download GPX
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">
        {google.truncated
          ? `Google Maps supports up to ${MAX_GOOGLE_WAYPOINTS} stops between start and end — extra stops are dropped there. `
          : ""}
        Apple Maps routes start → end; download the GPX for every stop offline.
      </p>
    </div>
  );
}
