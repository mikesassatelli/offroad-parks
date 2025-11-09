import { useState, useCallback } from "react";
import type { Park } from "@/lib/types";

export function useRouteBuilder() {
  const [routeParks, setRouteParks] = useState<Park[]>([]);

  const addParkToRoute = useCallback((park: Park) => {
    setRouteParks((currentRoute) => {
      // Don't add if already in route
      if (currentRoute.some((p) => p.id === park.id)) {
        return currentRoute;
      }
      return [...currentRoute, park];
    });
  }, []);

  const removeParkFromRoute = useCallback((parkId: string) => {
    setRouteParks((currentRoute) =>
      currentRoute.filter((park) => park.id !== parkId),
    );
  }, []);

  const clearRoute = useCallback(() => {
    setRouteParks([]);
  }, []);

  const reorderRoute = useCallback((fromIndex: number, toIndex: number) => {
    setRouteParks((currentRoute) => {
      const newRoute = [...currentRoute];
      const [removed] = newRoute.splice(fromIndex, 1);
      newRoute.splice(toIndex, 0, removed);
      return newRoute;
    });
  }, []);

  const isParkInRoute = useCallback(
    (parkId: string) => {
      return routeParks.some((park) => park.id === parkId);
    },
    [routeParks],
  );

  const totalRouteDistance = useCallback(() => {
    if (routeParks.length < 2) return 0;

    let totalDistance = 0;
    for (let i = 0; i < routeParks.length - 1; i++) {
      const park1 = routeParks[i];
      const park2 = routeParks[i + 1];

      if (park1.coords && park2.coords) {
        // Calculate haversine distance
        const R = 3959; // Earth's radius in miles
        const lat1 = (park1.coords.lat * Math.PI) / 180;
        const lat2 = (park2.coords.lat * Math.PI) / 180;
        const deltaLat =
          ((park2.coords.lat - park1.coords.lat) * Math.PI) / 180;
        const deltaLng =
          ((park2.coords.lng - park1.coords.lng) * Math.PI) / 180;

        const a =
          Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
          Math.cos(lat1) *
            Math.cos(lat2) *
            Math.sin(deltaLng / 2) *
            Math.sin(deltaLng / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        totalDistance += distance;
      }
    }

    return Math.round(totalDistance);
  }, [routeParks]);

  return {
    routeParks,
    addParkToRoute,
    removeParkFromRoute,
    clearRoute,
    reorderRoute,
    isParkInRoute,
    totalRouteDistance,
  };
}
