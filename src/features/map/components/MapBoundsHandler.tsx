import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { Park, RouteWaypoint } from "@/lib/types";

interface MapBoundsHandlerProps {
  parks: Park[];
  waypoints?: RouteWaypoint[];
}

export function MapBoundsHandler({ parks, waypoints }: MapBoundsHandlerProps) {
  const map = useMap();

  useEffect(() => {
    // If waypoints are provided and non-empty, fit to them
    if (waypoints && waypoints.length > 0) {
      if (waypoints.length === 1) {
        map.setView([waypoints[0].lat, waypoints[0].lng], 8);
        return;
      }
      const bounds = L.latLngBounds(
        waypoints.map((w) => [w.lat, w.lng] as [number, number]),
      );
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
      return;
    }

    const parksWithCoords = parks.filter((park) => park.coords);

    if (parksWithCoords.length === 0) {
      map.setView([39.8283, -98.5795], 4);
      return;
    }

    if (parksWithCoords.length === 1) {
      const park = parksWithCoords[0];
      map.setView([park.coords!.lat, park.coords!.lng], 8);
      return;
    }

    const bounds = L.latLngBounds(
      parksWithCoords.map((park) => [park.coords!.lat, park.coords!.lng]),
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parks.length, waypoints?.length, map]);

  return null;
}
