import { act, renderHook } from "@testing-library/react";
import { useFilteredParks } from "@/hooks/useFilteredParks";
import type { Park } from "@/lib/types";

describe("useFilteredParks", () => {
  const mockParks: Park[] = [
    {
      id: "park-1",
      name: "Awesome Sand Park",
      city: "Los Angeles",
      state: "California",
      coords: { lat: 34, lng: -118 },
      dayPassUSD: 25,
      milesOfTrails: 50,
      acres: 1000,
      utvAllowed: true,
      terrain: ["sand", "rocks"],
      amenities: ["camping", "restrooms"],
      difficulty: ["moderate"],
      notes: "Great for beginners",
    },
    {
      id: "park-2",
      name: "Rocky Mountain Trail",
      city: "Denver",
      state: "Colorado",
      coords: { lat: 39, lng: -104 },
      dayPassUSD: 35,
      milesOfTrails: 100,
      acres: 2000,
      utvAllowed: true,
      terrain: ["rocks", "mud"],
      amenities: ["camping", "fuel"],
      difficulty: ["difficult"],
      notes: "Advanced riders only",
    },
    {
      id: "park-3",
      name: "Beach Dunes",
      city: undefined,
      state: "California",
      coords: undefined,
      dayPassUSD: undefined,
      milesOfTrails: 20,
      acres: undefined,
      utvAllowed: false,
      terrain: ["sand"],
      amenities: [],
      difficulty: ["easy"],
    },
  ];

  it("should initialize with all parks sorted by name", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    expect(result.current.filteredParks).toHaveLength(3);
    // Parks should be sorted by name (default)
    expect(result.current.filteredParks[0].name).toBe("Awesome Sand Park");
    expect(result.current.filteredParks[1].name).toBe("Beach Dunes");
    expect(result.current.filteredParks[2].name).toBe("Rocky Mountain Trail");
  });

  it("should filter parks by search query (name)", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSearchQuery("sand");
    });

    expect(result.current.filteredParks).toHaveLength(1);
    expect(result.current.filteredParks[0].name).toBe("Awesome Sand Park");
  });

  it("should filter parks by search query (city)", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSearchQuery("denver");
    });

    expect(result.current.filteredParks).toHaveLength(1);
    expect(result.current.filteredParks[0].name).toBe("Rocky Mountain Trail");
  });

  it("should filter parks by search query (state)", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSearchQuery("colorado");
    });

    expect(result.current.filteredParks).toHaveLength(1);
    expect(result.current.filteredParks[0].name).toBe("Rocky Mountain Trail");
  });

  it("should filter parks by search query (notes)", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSearchQuery("advanced");
    });

    expect(result.current.filteredParks).toHaveLength(1);
    expect(result.current.filteredParks[0].name).toBe("Rocky Mountain Trail");
  });

  it("should be case-insensitive when searching", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSearchQuery("AWESOME");
    });

    expect(result.current.filteredParks).toHaveLength(1);
    expect(result.current.filteredParks[0].name).toBe("Awesome Sand Park");
  });

  it("should return all parks when search query is empty", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSearchQuery("   ");
    });

    expect(result.current.filteredParks).toHaveLength(3);
  });

  it("should filter parks by state", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSelectedState("California");
    });

    expect(result.current.filteredParks).toHaveLength(2);
    expect(
      result.current.filteredParks.every((p) => p.state === "California"),
    ).toBe(true);
  });

  it("should filter parks by terrain", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSelectedTerrain("rocks");
    });

    expect(result.current.filteredParks).toHaveLength(2);
    expect(
      result.current.filteredParks.every((p) => p.terrain.includes("rocks")),
    ).toBe(true);
  });

  it("should filter parks by amenity", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSelectedAmenity("fuel");
    });

    expect(result.current.filteredParks).toHaveLength(1);
    expect(result.current.filteredParks[0].name).toBe("Rocky Mountain Trail");
  });

  it("should combine multiple filters", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSelectedState("California");
      result.current.setSelectedTerrain("sand");
    });

    expect(result.current.filteredParks).toHaveLength(2);
    expect(
      result.current.filteredParks.every((p) => p.state === "California"),
    ).toBe(true);
    expect(
      result.current.filteredParks.every((p) => p.terrain.includes("sand")),
    ).toBe(true);
  });

  it("should combine search with filters", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSearchQuery("park");
      result.current.setSelectedState("California");
    });

    expect(result.current.filteredParks).toHaveLength(1);
    expect(result.current.filteredParks[0].name).toBe("Awesome Sand Park");
  });

  it("should sort parks by name (default)", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    expect(result.current.sortOption).toBe("name");
    expect(result.current.filteredParks[0].name).toBe("Awesome Sand Park");
    expect(result.current.filteredParks[1].name).toBe("Beach Dunes");
    expect(result.current.filteredParks[2].name).toBe("Rocky Mountain Trail");
  });

  it("should sort parks by price (low to high)", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSortOption("price");
    });

    expect(result.current.filteredParks[0].name).toBe("Awesome Sand Park"); // $25
    expect(result.current.filteredParks[1].name).toBe("Rocky Mountain Trail"); // $35
    expect(result.current.filteredParks[2].name).toBe("Beach Dunes"); // undefined (Infinity)
  });

  it("should sort parks by miles of trails (high to low)", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSortOption("miles");
    });

    expect(result.current.filteredParks[0].milesOfTrails).toBe(100);
    expect(result.current.filteredParks[1].milesOfTrails).toBe(50);
    expect(result.current.filteredParks[2].milesOfTrails).toBe(20);
  });

  it("should provide available states from parks", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    expect(result.current.availableStates).toEqual(["California", "Colorado"]);
  });

  it("should clear all filters", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    // Set all filters
    act(() => {
      result.current.setSearchQuery("test");
      result.current.setSelectedState("California");
      result.current.setSelectedTerrain("sand");
      result.current.setSelectedAmenity("camping");
    });

    // Clear all
    act(() => {
      result.current.clearAllFilters();
    });

    expect(result.current.searchQuery).toBe("");
    expect(result.current.selectedState).toBeUndefined();
    expect(result.current.selectedTerrain).toBeUndefined();
    expect(result.current.selectedAmenity).toBeUndefined();
    expect(result.current.filteredParks).toHaveLength(3);
  });

  it("should not clear sort option when clearing filters", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSortOption("price");
      result.current.setSearchQuery("test");
    });

    act(() => {
      result.current.clearAllFilters();
    });

    expect(result.current.sortOption).toBe("price");
  });

  it("should return empty array when no parks match filters", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSearchQuery("nonexistent park");
    });

    expect(result.current.filteredParks).toHaveLength(0);
  });

  it("should handle parks with undefined city", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSearchQuery("beach");
    });

    expect(result.current.filteredParks).toHaveLength(1);
    expect(result.current.filteredParks[0].name).toBe("Beach Dunes");
  });

  it("should handle parks with undefined price when sorting", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSortOption("price");
    });

    // Parks with undefined price should come last
    const lastPark =
      result.current.filteredParks[result.current.filteredParks.length - 1];
    expect(lastPark.dayPassUSD).toBeUndefined();
  });

  it("should handle parks with undefined miles when sorting", () => {
    const parksWithUndefinedMiles: Park[] = [
      { ...mockParks[0], milesOfTrails: undefined },
      mockParks[1],
      mockParks[2],
    ];

    const { result } = renderHook(() =>
      useFilteredParks({ parks: parksWithUndefinedMiles }),
    );

    act(() => {
      result.current.setSortOption("miles");
    });

    // Parks with undefined miles should be treated as 0
    const lastPark =
      result.current.filteredParks[result.current.filteredParks.length - 1];
    expect(lastPark.milesOfTrails).toBeUndefined();
  });

  it("should maintain sort order when filters change", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSortOption("price");
      result.current.setSelectedState("California");
    });

    expect(result.current.filteredParks[0].dayPassUSD).toBe(25);
    expect(result.current.filteredParks[1].dayPassUSD).toBeUndefined();
  });

  it("should handle both parks with undefined price using Infinity fallback", () => {
    const parksWithUndefinedPrices: Park[] = [
      { ...mockParks[0], dayPassUSD: undefined, name: "Park A" },
      { ...mockParks[1], dayPassUSD: undefined, name: "Park B" },
    ];

    const { result } = renderHook(() =>
      useFilteredParks({ parks: parksWithUndefinedPrices }),
    );

    act(() => {
      result.current.setSortOption("price");
    });

    // Both undefined prices should be treated as Infinity, sorted by name as tiebreaker
    expect(result.current.filteredParks).toHaveLength(2);
    expect(result.current.filteredParks[0].dayPassUSD).toBeUndefined();
    expect(result.current.filteredParks[1].dayPassUSD).toBeUndefined();
  });

  it("should handle both parks with undefined miles using 0 fallback", () => {
    const parksWithUndefinedMiles: Park[] = [
      { ...mockParks[0], milesOfTrails: undefined, name: "Park A" },
      { ...mockParks[1], milesOfTrails: undefined, name: "Park B" },
    ];

    const { result } = renderHook(() =>
      useFilteredParks({ parks: parksWithUndefinedMiles }),
    );

    act(() => {
      result.current.setSortOption("miles");
    });

    // Both undefined miles should be treated as 0, sorted by name as tiebreaker
    expect(result.current.filteredParks).toHaveLength(2);
    expect(result.current.filteredParks[0].milesOfTrails).toBeUndefined();
    expect(result.current.filteredParks[1].milesOfTrails).toBeUndefined();
  });

  it("should handle mix of defined and undefined prices", () => {
    const parksWithMixedPrices: Park[] = [
      { ...mockParks[0], dayPassUSD: 30 },
      { ...mockParks[1], dayPassUSD: undefined },
      { ...mockParks[2], dayPassUSD: 20 },
    ];

    const { result } = renderHook(() =>
      useFilteredParks({ parks: parksWithMixedPrices }),
    );

    act(() => {
      result.current.setSortOption("price");
    });

    // Should sort: 20, 30, undefined (Infinity)
    expect(result.current.filteredParks[0].dayPassUSD).toBe(20);
    expect(result.current.filteredParks[1].dayPassUSD).toBe(30);
    expect(result.current.filteredParks[2].dayPassUSD).toBeUndefined();
  });
});
