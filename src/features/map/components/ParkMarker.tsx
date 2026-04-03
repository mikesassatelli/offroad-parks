import { Marker, Popup, Tooltip } from "react-leaflet";
import type { Park, RouteWaypoint } from "@/lib/types";
import { formatParkPricingSummary } from "@/lib/formatting";
import { createParkPinIcon, defaultParkIcon } from "../utils/markers";
import Link from "next/link";

interface ParkMarkerProps {
  park: Park;
  isInRoute: boolean;
  routeIndex: number;
  routeWaypoint?: RouteWaypoint;
  onAddToRoute?: (park: Park) => void;
  showLabel?: boolean;
}

export function ParkMarker({
  park,
  isInRoute,
  routeIndex,
  routeWaypoint,
  onAddToRoute,
  showLabel,
}: ParkMarkerProps) {
  if (!park.coords) return null;

  const icon = isInRoute
    ? createParkPinIcon(routeIndex, routeWaypoint?.color)
    : defaultParkIcon;

  return (
    <Marker
      key={park.id}
      position={[park.coords.lat, park.coords.lng]}
      icon={icon}
    >
      <Popup autoPan={false}>
        <div className="min-w-[200px]">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="font-semibold text-base">{park.name}</div>
            {isInRoute && (
              <span className="text-xs text-muted-foreground">Stop {routeIndex + 1}</span>
            )}
          </div>
          <div className="text-sm text-muted-foreground mb-2">
            {park.address.city ? `${park.address.city}, ` : ""}
            {park.address.state}
          </div>
          <div className="text-sm space-y-1">
            <div>
              <span className="text-muted-foreground">Trail miles:</span>{" "}
              {park.milesOfTrails ?? "—"}
            </div>
            <div>
              <span className="text-muted-foreground">Pricing:</span>{" "}
              {formatParkPricingSummary(park)}
            </div>
            <div>
              <span className="text-muted-foreground">Acres:</span> {park.acres ?? "—"}
            </div>
          </div>
          <div className="flex gap-2 mt-2">
            {onAddToRoute && !isInRoute && (
              <button
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  onAddToRoute(park);
                }}
                className="text-sm bg-primary text-primary-foreground px-3 py-1 rounded hover:bg-primary/90 transition cursor-pointer"
              >
                Add to Route
              </button>
            )}
            <Link
              href={`/parks/${park.id}`}
              className="text-sm text-primary hover:underline cursor-pointer"
            >
              View details →
            </Link>
          </div>
        </div>
      </Popup>
      {showLabel && (
        <Tooltip permanent direction="top" offset={[0, -8]} className="leaflet-park-label">
          {park.name}
        </Tooltip>
      )}
    </Marker>
  );
}
