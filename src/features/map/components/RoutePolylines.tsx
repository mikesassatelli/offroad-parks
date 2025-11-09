import { Polyline, Tooltip } from "react-leaflet";
import type { Park } from "@/lib/types";
import { calculateDistance } from "@/features/map/utils/distance";

interface RoutePolylinesProps {
  routeParks: Park[];
}

export function RoutePolylines({ routeParks }: RoutePolylinesProps) {
  if (routeParks.length < 2) return null;

  return (
    <>
      {routeParks.slice(0, -1).map((park, index) => {
        const nextPark = routeParks[index + 1];
        if (!park.coords || !nextPark.coords) return null;

        const segmentPositions: [number, number][] = [
          [park.coords.lat, park.coords.lng],
          [nextPark.coords.lat, nextPark.coords.lng],
        ];

        const distance = calculateDistance(
          park.coords.lat,
          park.coords.lng,
          nextPark.coords.lat,
          nextPark.coords.lng,
        );

        return (
          <Polyline
            key={`${park.id}-${nextPark.id}`}
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
