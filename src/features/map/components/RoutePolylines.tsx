import { Polyline, Tooltip } from "react-leaflet";
import type { RouteWaypoint } from "@/lib/types";
import { calculateDistance } from "@/features/map/utils/distance";

interface RoutePolylinesProps {
  routeParks: RouteWaypoint[];
  routeGeometry?: GeoJSON.LineString | null;
}

export function RoutePolylines({ routeParks, routeGeometry }: RoutePolylinesProps) {
  if (routeParks.length < 2) return null;

  // Real road-following route from Mapbox Directions API
  if (routeGeometry) {
    // GeoJSON coords are [lng, lat] — Leaflet needs [lat, lng]
    const positions: [number, number][] = routeGeometry.coordinates.map(
      ([lng, lat]) => [lat, lng],
    );
    return (
      <Polyline
        positions={positions}
        color="#3b82f6"
        weight={4}
        opacity={0.8}
      />
    );
  }

  // Fallback: straight dashed lines between waypoints
  return (
    <>
      {routeParks.slice(0, -1).map((waypoint, index) => {
        const nextWaypoint = routeParks[index + 1];

        const segmentPositions: [number, number][] = [
          [waypoint.lat, waypoint.lng],
          [nextWaypoint.lat, nextWaypoint.lng],
        ];

        const distance = calculateDistance(
          waypoint.lat,
          waypoint.lng,
          nextWaypoint.lat,
          nextWaypoint.lng,
        );

        return (
          <Polyline
            key={`${waypoint.id}-${nextWaypoint.id}`}
            positions={segmentPositions}
            color="#3b82f6"
            weight={3}
            opacity={0.7}
            dashArray="10, 10"
          >
            <Tooltip
              permanent
              direction="center"
              className="bg-white px-2 py-1 rounded shadow-md border border-blue-300 text-xs font-semibold text-blue-700"
            >
              {distance} mi
            </Tooltip>
          </Polyline>
        );
      })}
    </>
  );
}
