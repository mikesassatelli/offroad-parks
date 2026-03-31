import { act, renderHook } from "@testing-library/react";
import { useRouteBuilder } from "@/hooks/useRouteBuilder";
import type { Park } from "@/lib/types";
import { vi } from "vitest";

// Mock the routing utility so tests don't make real HTTP calls
vi.mock("@/features/map/utils/routing", () => ({
  fetchMapboxRoute: vi.fn(() => Promise.resolve(null)),
}));

describe("useRouteBuilder", () => {
  const mockPark1: Park = {
    id: "park-1",
    name: "Park 1",
    address: { state: "CA" },
    coords: { lat: 34.0522, lng: -118.2437 }, // Los Angeles
    terrain: ["sand"],
    amenities: [],
    camping: [],
    vehicleTypes: [],
  };

  const mockPark2: Park = {
    id: "park-2",
    name: "Park 2",
    address: { state: "CA" },
    coords: { lat: 37.7749, lng: -122.4194 }, // San Francisco
    terrain: ["rocks"],
    amenities: [],
    camping: [],
    vehicleTypes: [],
  };

  const mockPark3: Park = {
    id: "park-3",
    name: "Park 3",
    address: { state: "CA" },
    coords: { lat: 36.7783, lng: -119.4179 }, // Between LA and SF
    terrain: ["mud"],
    amenities: [],
    camping: [],
    vehicleTypes: [],
  };

  const mockParkNoCoords: Park = {
    id: "park-no-coords",
    name: "Park Without Coords",
    address: { state: "TX" },
    terrain: ["sand"],
    amenities: [],
    camping: [],
    vehicleTypes: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should initialize with empty route", () => {
    const { result } = renderHook(() => useRouteBuilder());
    expect(result.current.waypoints).toEqual([]);
    expect(result.current.routeParks).toEqual([]);
  });

  it("should add park to route as waypoint", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
    });

    expect(result.current.waypoints).toHaveLength(1);
    expect(result.current.waypoints[0].type).toBe("park");
    expect(result.current.waypoints[0].parkId).toBe("park-1");
    expect(result.current.waypoints[0].label).toBe("Park 1");
    expect(result.current.waypoints[0].lat).toBe(34.0522);
    expect(result.current.waypoints[0].lng).toBe(-118.2437);
  });

  it("should return false and not add park without coords", () => {
    const { result } = renderHook(() => useRouteBuilder());

    let added: boolean;
    act(() => {
      added = result.current.addParkToRoute(mockParkNoCoords);
    });

    expect(added!).toBe(false);
    expect(result.current.waypoints).toHaveLength(0);
  });

  it("should return true when adding park with coords", () => {
    const { result } = renderHook(() => useRouteBuilder());

    let added: boolean;
    act(() => {
      added = result.current.addParkToRoute(mockPark1);
    });

    expect(added!).toBe(true);
  });

  it("should not add duplicate park to route", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark1);
    });

    expect(result.current.waypoints).toHaveLength(1);
  });

  it("should add multiple parks to route", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark2);
      result.current.addParkToRoute(mockPark3);
    });

    expect(result.current.waypoints).toHaveLength(3);
    expect(result.current.waypoints[0].parkId).toBe("park-1");
    expect(result.current.waypoints[1].parkId).toBe("park-2");
    expect(result.current.waypoints[2].parkId).toBe("park-3");
  });

  it("should add custom waypoint", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addCustomWaypoint("My Stop", 34.5, -118.5);
    });

    expect(result.current.waypoints).toHaveLength(1);
    expect(result.current.waypoints[0].type).toBe("custom");
    expect(result.current.waypoints[0].label).toBe("My Stop");
    expect(result.current.waypoints[0].lat).toBe(34.5);
    expect(result.current.waypoints[0].lng).toBe(-118.5);
  });

  it("should remove waypoint by waypointId using removeWaypoint", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark2);
    });

    const waypointId = result.current.waypoints[0].id;

    act(() => {
      result.current.removeWaypoint(waypointId);
    });

    expect(result.current.waypoints).toHaveLength(1);
    expect(result.current.waypoints[0].parkId).toBe("park-2");
  });

  it("should remove park from route using backward-compat removeParkFromRoute", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark2);
    });

    act(() => {
      result.current.removeParkFromRoute("park-1");
    });

    expect(result.current.waypoints).toHaveLength(1);
    expect(result.current.waypoints[0].parkId).toBe("park-2");
  });

  it("should handle removing non-existent park", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
    });

    act(() => {
      result.current.removeParkFromRoute("non-existent");
    });

    expect(result.current.waypoints).toHaveLength(1);
  });

  it("should clear entire route", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark2);
      result.current.addParkToRoute(mockPark3);
    });

    expect(result.current.waypoints).toHaveLength(3);

    act(() => {
      result.current.clearRoute();
    });

    expect(result.current.waypoints).toEqual([]);
  });

  it("should reorder waypoints in route", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark2);
      result.current.addParkToRoute(mockPark3);
    });

    // Move waypoint from index 0 to index 2
    act(() => {
      result.current.reorderRoute(0, 2);
    });

    expect(result.current.waypoints[0].parkId).toBe("park-2");
    expect(result.current.waypoints[1].parkId).toBe("park-3");
    expect(result.current.waypoints[2].parkId).toBe("park-1");
  });

  it("should reorder from end to beginning", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark2);
      result.current.addParkToRoute(mockPark3);
    });

    act(() => {
      result.current.reorderRoute(2, 0);
    });

    expect(result.current.waypoints[0].parkId).toBe("park-3");
    expect(result.current.waypoints[1].parkId).toBe("park-1");
    expect(result.current.waypoints[2].parkId).toBe("park-2");
  });

  it("should check if park is in route", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
    });

    expect(result.current.isParkInRoute("park-1")).toBe(true);
    expect(result.current.isParkInRoute("park-2")).toBe(false);
  });

  it("should return 0 distance for empty route", () => {
    const { result } = renderHook(() => useRouteBuilder());
    expect(result.current.totalRouteDistance()).toBe(0);
  });

  it("should return 0 distance for single waypoint route", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
    });

    expect(result.current.totalRouteDistance()).toBe(0);
  });

  it("should calculate fallback haversine distance for two-park route", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1); // LA
      result.current.addParkToRoute(mockPark2); // SF
    });

    const distance = result.current.totalRouteDistance();

    // LA to SF is approximately 347 miles
    expect(distance).toBeGreaterThan(340);
    expect(distance).toBeLessThan(355);
  });

  it("should calculate total distance for multi-park route", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1); // LA
      result.current.addParkToRoute(mockPark3); // Central CA
      result.current.addParkToRoute(mockPark2); // SF
    });

    const distance = result.current.totalRouteDistance();
    expect(distance).toBeGreaterThan(347);
    expect(distance).toBeGreaterThan(0);
  });

  it("should recalculate distance when route changes", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark2);
    });

    const initialDistance = result.current.totalRouteDistance();

    act(() => {
      result.current.addParkToRoute(mockPark3);
    });

    const newDistance = result.current.totalRouteDistance();
    expect(newDistance).not.toBe(initialDistance);
    expect(newDistance).toBeGreaterThan(initialDistance);
  });

  it("should update isParkInRoute when park is added", () => {
    const { result } = renderHook(() => useRouteBuilder());

    expect(result.current.isParkInRoute("park-1")).toBe(false);

    act(() => {
      result.current.addParkToRoute(mockPark1);
    });

    expect(result.current.isParkInRoute("park-1")).toBe(true);
  });

  it("should update isParkInRoute when park is removed", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
    });

    expect(result.current.isParkInRoute("park-1")).toBe(true);

    act(() => {
      result.current.removeParkFromRoute("park-1");
    });

    expect(result.current.isParkInRoute("park-1")).toBe(false);
  });

  it("should maintain waypoint order in route", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark2);
      result.current.addParkToRoute(mockPark3);
    });

    expect(result.current.waypoints.map((w) => w.parkId)).toEqual([
      "park-1",
      "park-2",
      "park-3",
    ]);
  });

  it("should handle reordering with same from and to index", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark2);
    });

    const beforeIds = result.current.waypoints.map((w) => w.parkId);

    act(() => {
      result.current.reorderRoute(0, 0);
    });

    expect(result.current.waypoints.map((w) => w.parkId)).toEqual(beforeIds);
  });

  it("should return rounded distance value when no routeResult", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark2);
    });

    const distance = result.current.totalRouteDistance();
    expect(Number.isInteger(distance)).toBe(true);
  });

  it("should expose routeParks as backward-compat alias for waypoints", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
    });

    expect(result.current.routeParks).toBe(result.current.waypoints);
  });
});
