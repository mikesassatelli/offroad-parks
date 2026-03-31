import { useCallback, useEffect, useRef, useState } from "react";
import type { Park, RouteWaypoint, SavedRoute } from "@/lib/types";
import { fetchMapboxRoute, type RouteResult } from "@/features/map/utils/routing";
import { calculateDistance } from "@/features/map/utils/distance";

export function useRouteBuilder() {
  const [waypoints, setWaypoints] = useState<RouteWaypoint[]>([]);
  const [routeResult, setRouteResult] = useState<RouteResult | null>(null);
  const [isRouting, setIsRouting] = useState(false);
  const [savedRouteId, setSavedRouteId] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounced routing effect — fires 500ms after waypoints change
  useEffect(() => {
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }

    if (waypoints.length < 2) {
      setRouteResult(null);
      setIsRouting(false);
      return;
    }

    setIsRouting(true);
    debounceTimer.current = setTimeout(async () => {
      const result = await fetchMapboxRoute(waypoints.map((w) => ({ lat: w.lat, lng: w.lng })));
      setRouteResult(result);
      setIsRouting(false);
    }, 500);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [waypoints]);

  const addParkToRoute = useCallback((park: Park): boolean => {
    if (!park.coords) return false;
    setWaypoints((current) => {
      if (current.some((w) => w.parkId === park.id)) {
        return current;
      }
      const waypoint: RouteWaypoint = {
        id: `park-${park.id}-${Date.now()}`,
        type: "park",
        label: park.name,
        parkId: park.id,
        parkSlug: park.id, // Park.id is slug (see transformDbPark)
        lat: park.coords!.lat,
        lng: park.coords!.lng,
      };
      return [...current, waypoint];
    });
    return true;
  }, []);

  const addCustomWaypoint = useCallback(
    (label: string, lat: number, lng: number) => {
      const waypoint: RouteWaypoint = {
        id: `custom-${Date.now()}`,
        type: "custom",
        label,
        lat,
        lng,
      };
      setWaypoints((current) => [...current, waypoint]);
    },
    [],
  );

  const removeWaypoint = useCallback((waypointId: string) => {
    setWaypoints((current) => current.filter((w) => w.id !== waypointId));
  }, []);

  // Backward-compat alias — removes by parkId or waypointId
  const removeParkFromRoute = useCallback((parkId: string) => {
    setWaypoints((current) =>
      current.filter((w) => w.parkId !== parkId && w.id !== parkId),
    );
  }, []);

  const clearRoute = useCallback(() => {
    setWaypoints([]);
    setSavedRouteId(null);
  }, []);

  const reorderRoute = useCallback((fromIndex: number, toIndex: number) => {
    setWaypoints((current) => {
      const newWaypoints = [...current];
      const [removed] = newWaypoints.splice(fromIndex, 1);
      newWaypoints.splice(toIndex, 0, removed);
      return newWaypoints;
    });
  }, []);

  const isParkInRoute = useCallback(
    (parkId: string) => {
      return waypoints.some((w) => w.parkId === parkId);
    },
    [waypoints],
  );

  const totalRouteDistance = useCallback((): number => {
    if (routeResult?.distanceMi != null) {
      return routeResult.distanceMi;
    }

    if (waypoints.length < 2) return 0;

    let total = 0;
    for (let i = 0; i < waypoints.length - 1; i++) {
      total += calculateDistance(
        waypoints[i].lat,
        waypoints[i].lng,
        waypoints[i + 1].lat,
        waypoints[i + 1].lng,
      );
    }
    return Math.round(total);
  }, [waypoints, routeResult]);

  const saveRoute = useCallback(
    async (title: string, isPublic: boolean): Promise<SavedRoute | null> => {
      if (waypoints.length < 2 || !title.trim()) return null;
      setIsSaving(true);
      try {
        const body: Record<string, unknown> = {
          title: title.trim(),
          isPublic,
          waypoints,
          routeGeometry: routeResult?.geometry ?? null,
          totalDistanceMi: routeResult?.distanceMi ?? null,
          estimatedDurationMin: routeResult?.durationMin ?? null,
        };
        const res = await fetch("/api/routes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok) return null;
        const saved: SavedRoute = await res.json();
        setSavedRouteId(saved.id);
        return saved;
      } catch {
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [waypoints, routeResult],
  );

  const loadRoute = useCallback((route: SavedRoute) => {
    setWaypoints(route.waypoints);
    setSavedRouteId(route.id);
    // routeGeometry will be re-fetched by the routing effect
  }, []);

  // Backward compat: expose routeParks as array of objects with id for ParkMarker
  const routeParks = waypoints;

  return {
    // New API
    waypoints,
    routeResult,
    isRouting,
    savedRouteId,
    isSaving,
    addParkToRoute,
    addCustomWaypoint,
    removeWaypoint,
    loadRoute,
    saveRoute,
    // Backward compat
    routeParks,
    removeParkFromRoute,
    clearRoute,
    reorderRoute,
    isParkInRoute,
    totalRouteDistance,
  };
}
