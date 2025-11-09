import { useEffect } from "react";
import { useMap } from "react-leaflet";
import L from "leaflet";
import type { Park } from "@/lib/types";

interface MapBoundsHandlerProps {
  parks: Park[];
}

export function MapBoundsHandler({ parks }: MapBoundsHandlerProps) {
  const map = useMap();

  useEffect(() => {
    const parksWithCoords = parks.filter((park) => park.coords);

    if (parksWithCoords.length === 0) {
      // Default to center of US if no parks have coordinates
      map.setView([39.8283, -98.5795], 4);
      return;
    }

    if (parksWithCoords.length === 1) {
      const park = parksWithCoords[0];
      map.setView([park.coords!.lat, park.coords!.lng], 8);
      return;
    }

    // Fit bounds to show all parks
    const bounds = L.latLngBounds(
      parksWithCoords.map((park) => [park.coords!.lat, park.coords!.lng]),
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parks.length, map]); // Only re-run when number of parks changes, not the array reference

  return null;
}
