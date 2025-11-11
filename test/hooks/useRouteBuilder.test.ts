import { act, renderHook } from "@testing-library/react";
import { useRouteBuilder } from "@/hooks/useRouteBuilder";
import type { Park } from "@/lib/types";

describe("useRouteBuilder", () => {
  const mockPark1: Park = {
    id: "park-1",
    name: "Park 1",
    state: "CA",
    coords: { lat: 34.0522, lng: -118.2437 }, // Los Angeles
    utvAllowed: true,
    terrain: ["sand"],
    amenities: [],
    difficulty: ["easy"],
  };

  const mockPark2: Park = {
    id: "park-2",
    name: "Park 2",
    state: "CA",
    coords: { lat: 37.7749, lng: -122.4194 }, // San Francisco
    utvAllowed: true,
    terrain: ["rocks"],
    amenities: [],
    difficulty: ["moderate"],
  };

  const mockPark3: Park = {
    id: "park-3",
    name: "Park 3",
    state: "CA",
    coords: { lat: 36.7783, lng: -119.4179 }, // Between LA and SF
    utvAllowed: true,
    terrain: ["mud"],
    amenities: [],
    difficulty: ["difficult"],
  };

  const mockParkNoCoords: Park = {
    id: "park-no-coords",
    name: "Park Without Coords",
    state: "TX",
    utvAllowed: true,
    terrain: ["sand"],
    amenities: [],
    difficulty: ["easy"],
  };

  it("should initialize with empty route", () => {
    const { result } = renderHook(() => useRouteBuilder());

    expect(result.current.routeParks).toEqual([]);
  });

  it("should add park to route", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
    });

    expect(result.current.routeParks).toHaveLength(1);
    expect(result.current.routeParks[0]).toEqual(mockPark1);
  });

  it("should not add duplicate park to route", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark1);
    });

    expect(result.current.routeParks).toHaveLength(1);
  });

  it("should add multiple parks to route", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark2);
      result.current.addParkToRoute(mockPark3);
    });

    expect(result.current.routeParks).toHaveLength(3);
    expect(result.current.routeParks[0].id).toBe("park-1");
    expect(result.current.routeParks[1].id).toBe("park-2");
    expect(result.current.routeParks[2].id).toBe("park-3");
  });

  it("should remove park from route", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark2);
    });

    expect(result.current.routeParks).toHaveLength(2);

    act(() => {
      result.current.removeParkFromRoute("park-1");
    });

    expect(result.current.routeParks).toHaveLength(1);
    expect(result.current.routeParks[0].id).toBe("park-2");
  });

  it("should handle removing non-existent park", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
    });

    act(() => {
      result.current.removeParkFromRoute("non-existent");
    });

    expect(result.current.routeParks).toHaveLength(1);
    expect(result.current.routeParks[0].id).toBe("park-1");
  });

  it("should clear entire route", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark2);
      result.current.addParkToRoute(mockPark3);
    });

    expect(result.current.routeParks).toHaveLength(3);

    act(() => {
      result.current.clearRoute();
    });

    expect(result.current.routeParks).toEqual([]);
  });

  it("should reorder parks in route", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark2);
      result.current.addParkToRoute(mockPark3);
    });

    // Move park from index 0 to index 2
    act(() => {
      result.current.reorderRoute(0, 2);
    });

    expect(result.current.routeParks[0].id).toBe("park-2");
    expect(result.current.routeParks[1].id).toBe("park-3");
    expect(result.current.routeParks[2].id).toBe("park-1");
  });

  it("should reorder parks from end to beginning", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark2);
      result.current.addParkToRoute(mockPark3);
    });

    // Move park from index 2 to index 0
    act(() => {
      result.current.reorderRoute(2, 0);
    });

    expect(result.current.routeParks[0].id).toBe("park-3");
    expect(result.current.routeParks[1].id).toBe("park-1");
    expect(result.current.routeParks[2].id).toBe("park-2");
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

  it("should return 0 distance for single park route", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
    });

    expect(result.current.totalRouteDistance()).toBe(0);
  });

  it("should calculate distance for two-park route", () => {
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

    // Total distance should be greater than direct LA to SF
    expect(distance).toBeGreaterThan(347);
    expect(distance).toBeGreaterThan(0);
  });

  it("should handle parks without coordinates in distance calculation", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockParkNoCoords);
      result.current.addParkToRoute(mockPark2);
    });

    const distance = result.current.totalRouteDistance();

    // Parks without coords don't contribute to distance
    // Only calculates between consecutive parks with coords
    expect(distance).toBeGreaterThanOrEqual(0);
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

  it("should maintain park order in route", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark2);
      result.current.addParkToRoute(mockPark3);
    });

    expect(result.current.routeParks.map((p) => p.id)).toEqual([
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

    const beforeReorder = [...result.current.routeParks];

    act(() => {
      result.current.reorderRoute(0, 0);
    });

    expect(result.current.routeParks).toEqual(beforeReorder);
  });

  it("should return rounded distance value", () => {
    const { result } = renderHook(() => useRouteBuilder());

    act(() => {
      result.current.addParkToRoute(mockPark1);
      result.current.addParkToRoute(mockPark2);
    });

    const distance = result.current.totalRouteDistance();

    expect(Number.isInteger(distance)).toBe(true);
  });
});
