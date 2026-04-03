"use client";

import { Marker, Popup } from "react-leaflet";
import type { RouteWaypoint } from "@/lib/types";
import { createCustomWaypointIcon } from "../utils/markers";

interface CustomWaypointMarkerProps {
  waypoint: RouteWaypoint;
  index: number;
  onRemove?: (waypointId: string) => void;
}

export function CustomWaypointMarker({
  waypoint,
  index,
  onRemove,
}: CustomWaypointMarkerProps) {
  const icon = createCustomWaypointIcon(waypoint.icon ?? "📍", waypoint.color);

  return (
    <Marker position={[waypoint.lat, waypoint.lng]} icon={icon}>
      <Popup autoPan={false}>
        <div className="min-w-[160px]">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="font-semibold text-base">{waypoint.label}</div>
            <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold bg-orange-100 text-orange-700 rounded-full flex-shrink-0">
              {index + 1}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mb-2">Custom stop</div>
          {onRemove && (
            <button
              type="button"
              onMouseDown={(e) => {
                e.preventDefault();
                onRemove(waypoint.id);
              }}
              className="text-xs text-destructive hover:underline cursor-pointer"
            >
              Remove from route
            </button>
          )}
        </div>
      </Popup>
    </Marker>
  );
}
