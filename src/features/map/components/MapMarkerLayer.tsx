import { Marker, Tooltip } from "react-leaflet";
import type { ParkMapMarker } from "@/lib/types";
import { createMapMarkerIcon } from "../utils/markers";

interface MapMarkerLayerProps {
  markers: ParkMapMarker[];
}

/** Human-readable label for a marker type (used in the tooltip). */
const TYPE_LABEL: Record<string, string> = {
  TRAILHEAD: "Trailhead",
  CAMPGROUND: "Campground",
  RECREATION_AREA: "Recreation area",
  STAGING: "Staging area",
  PARKING: "Parking",
  GATE: "Gate",
  POI: "Point of interest",
};

/**
 * Renders a park's point markers (trailheads, campgrounds/rec areas) as Leaflet
 * pins with a hover tooltip. Purely presentational — the markers come from the
 * park's `mapMarkers` relation. See ParkMapMarker / docs/poc/trail-overlay.md.
 */
export function MapMarkerLayer({ markers }: MapMarkerLayerProps) {
  return (
    <>
      {markers.map((m) => (
        <Marker
          key={m.id}
          position={[m.lat, m.lng]}
          icon={createMapMarkerIcon(m.type)}
        >
          <Tooltip direction="top" offset={[0, -28]}>
            <span className="font-semibold">{m.name}</span>
            <br />
            <span className="text-xs">{TYPE_LABEL[m.type] ?? m.type}</span>
            {m.notes ? (
              <>
                <br />
                <span className="text-xs">{m.notes}</span>
              </>
            ) : null}
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}
