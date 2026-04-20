import { act, renderHook } from "@testing-library/react";
import { useFilteredParks } from "@/hooks/useFilteredParks";
import type { Park } from "@/lib/types";

describe("useFilteredParks", () => {
  const mockParks: Park[] = [
    {
      id: "park-1",
      name: "Awesome Sand Park",
      address: {
        city: "Los Angeles",
        state: "California",
      },
      coords: { lat: 34, lng: -118 },
      dayPassUSD: 25,
      milesOfTrails: 50,
      acres: 1000,
      terrain: ["sand", "rocks"],
      amenities: ["restrooms"],
      camping: [],
      vehicleTypes: [],
      notes: "Great for beginners",
    },
    {
      id: "park-2",
      name: "Rocky Mountain Trail",
      address: {
        city: "Denver",
        state: "Colorado",
      },
      coords: { lat: 39, lng: -104 },
      dayPassUSD: 35,
      milesOfTrails: 100,
      acres: 2000,
      terrain: ["rocks", "mud"],
      amenities: ["fuel"],
      camping: [],
      vehicleTypes: [],
      notes: "Advanced riders only",
    },
    {
      id: "park-3",
      name: "Beach Dunes",
      address: {
        state: "California",
      },
      coords: undefined,
      dayPassUSD: undefined,
      milesOfTrails: 20,
      acres: undefined,
      terrain: ["sand"],
      amenities: [],
      camping: [],
      vehicleTypes: [],
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
      result.current.filteredParks.every((p) => p.address.state === "California"),
    ).toBe(true);
  });

  it("should filter parks by terrain", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSelectedTerrains(["rocks"]);
    });

    expect(result.current.filteredParks).toHaveLength(2);
    expect(
      result.current.filteredParks.every((p) => p.terrain.includes("rocks")),
    ).toBe(true);
  });

  it("should filter parks by amenity", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSelectedAmenities(["fuel"]);
    });

    expect(result.current.filteredParks).toHaveLength(1);
    expect(result.current.filteredParks[0].name).toBe("Rocky Mountain Trail");
  });

  it("should combine multiple filters", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setSelectedState("California");
      result.current.setSelectedTerrains(["sand"]);
    });

    expect(result.current.filteredParks).toHaveLength(2);
    expect(
      result.current.filteredParks.every((p) => p.address.state === "California"),
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

  it("should filter parks by minimum trail miles", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setMinTrailMiles(30);
    });

    expect(result.current.filteredParks).toHaveLength(2);
    expect(
      result.current.filteredParks.every((p) => (p.milesOfTrails ?? 0) >= 30),
    ).toBe(true);
  });

  it("should filter parks by minimum acres", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setMinAcres(1500);
    });

    expect(result.current.filteredParks).toHaveLength(1);
    expect(result.current.filteredParks[0].name).toBe("Rocky Mountain Trail");
  });

  it("should combine trail miles and acres filters", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setMinTrailMiles(30);
      result.current.setMinAcres(500);
    });

    expect(result.current.filteredParks).toHaveLength(2);
  });

  it("should provide max trail miles based on parks data", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    expect(result.current.maxTrailMiles).toBe(100);
  });

  it("should provide max acres based on parks data", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    expect(result.current.maxAcres).toBe(2000);
  });

  it("should clear all filters", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    // Set all filters
    act(() => {
      result.current.setSearchQuery("test");
      result.current.setSelectedState("California");
      result.current.setSelectedTerrains(["sand"]);
      result.current.setSelectedAmenities(["camping"]);
      result.current.setMinTrailMiles(50);
      result.current.setMinAcres(1000);
    });

    // Clear all
    act(() => {
      result.current.clearAllFilters();
    });

    expect(result.current.searchQuery).toBe("");
    expect(result.current.selectedState).toBeUndefined();
    expect(result.current.selectedTerrains).toEqual([]);
    expect(result.current.selectedAmenities).toEqual([]);
    expect(result.current.minTrailMiles).toBe(0);
    expect(result.current.minAcres).toBe(0);
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

  it("should filter parks by flags required (yes)", () => {
    const parksWithFlags: Park[] = [
      { ...mockParks[0], flagsRequired: true },
      { ...mockParks[1], flagsRequired: false },
      { ...mockParks[2] },
    ];
    const { result } = renderHook(() => useFilteredParks({ parks: parksWithFlags }));

    act(() => { result.current.setFlagsRequired("yes"); });

    expect(result.current.filteredParks).toHaveLength(1);
    expect(result.current.filteredParks[0].flagsRequired).toBe(true);
  });

  it("should filter parks by flags required (no)", () => {
    const parksWithFlags: Park[] = [
      { ...mockParks[0], flagsRequired: true },
      { ...mockParks[1], flagsRequired: false },
      { ...mockParks[2] },
    ];
    const { result } = renderHook(() => useFilteredParks({ parks: parksWithFlags }));

    act(() => { result.current.setFlagsRequired("no"); });

    expect(result.current.filteredParks).toHaveLength(2);
    expect(result.current.filteredParks.every((p) => p.flagsRequired !== true)).toBe(true);
  });

  it("should filter parks by spark arrestor required (yes)", () => {
    const parksWithSpark: Park[] = [
      { ...mockParks[0], sparkArrestorRequired: true },
      { ...mockParks[1], sparkArrestorRequired: false },
      { ...mockParks[2] },
    ];
    const { result } = renderHook(() => useFilteredParks({ parks: parksWithSpark }));

    act(() => { result.current.setSparkArrestorRequired("yes"); });

    expect(result.current.filteredParks).toHaveLength(1);
    expect(result.current.filteredParks[0].sparkArrestorRequired).toBe(true);
  });

  it("should filter parks by spark arrestor required (no)", () => {
    const parksWithSpark: Park[] = [
      { ...mockParks[0], sparkArrestorRequired: true },
      { ...mockParks[1], sparkArrestorRequired: false },
      { ...mockParks[2] },
    ];
    const { result } = renderHook(() => useFilteredParks({ parks: parksWithSpark }));

    act(() => { result.current.setSparkArrestorRequired("no"); });

    expect(result.current.filteredParks).toHaveLength(2);
    expect(result.current.filteredParks.every((p) => p.sparkArrestorRequired !== true)).toBe(true);
  });

  it("should sort parks by most reviewed (review count desc)", () => {
    const parksWithReviews: Park[] = [
      { ...mockParks[0], reviewCount: 5 },
      { ...mockParks[1], reviewCount: 20 },
      { ...mockParks[2], reviewCount: 1 },
    ];
    const { result } = renderHook(() => useFilteredParks({ parks: parksWithReviews }));

    act(() => { result.current.setSortOption("most-reviewed"); });

    expect(result.current.filteredParks[0].reviewCount).toBe(20);
    expect(result.current.filteredParks[1].reviewCount).toBe(5);
    expect(result.current.filteredParks[2].reviewCount).toBe(1);
  });

  it("should sort parks with undefined reviewCount last when sorting by most reviewed", () => {
    const parksWithMixedReviews: Park[] = [
      { ...mockParks[0], reviewCount: undefined },
      { ...mockParks[1], reviewCount: 10 },
      { ...mockParks[2], reviewCount: undefined },
    ];
    const { result } = renderHook(() => useFilteredParks({ parks: parksWithMixedReviews }));

    act(() => { result.current.setSortOption("most-reviewed"); });

    expect(result.current.filteredParks[0].reviewCount).toBe(10);
  });

  it("should clear flagsRequired and sparkArrestorRequired when clearing filters", () => {
    const { result } = renderHook(() => useFilteredParks({ parks: mockParks }));

    act(() => {
      result.current.setFlagsRequired("yes");
      result.current.setSparkArrestorRequired("yes");
    });

    act(() => { result.current.clearAllFilters(); });

    expect(result.current.flagsRequired).toBe("");
    expect(result.current.sparkArrestorRequired).toBe("");
  });

  it("should sort parks by distance-nearest when userCoords provided", () => {
    // User is in Denver — park-2 (Denver, lat 39 lng -104) should be nearest
    const userCoords = { lat: 39.7392, lng: -104.9903 };
    const { result } = renderHook(() =>
      useFilteredParks({ parks: mockParks, userCoords }),
    );

    act(() => {
      result.current.setSortOption("distance-nearest");
    });

    // park-2 (Denver) should be first (closest to Denver user coords)
    expect(result.current.filteredParks[0].id).toBe("park-2");
    // park-1 (Los Angeles) should be second
    expect(result.current.filteredParks[1].id).toBe("park-1");
    // park-3 has no coords, so it should be last (Infinity distance)
    expect(result.current.filteredParks[2].id).toBe("park-3");
  });

  it("should not change order for distance-nearest when userCoords is null", () => {
    const { result } = renderHook(() =>
      useFilteredParks({ parks: mockParks, userCoords: null }),
    );

    act(() => {
      result.current.setSortOption("distance-nearest");
    });

    // Without coords the comparator returns 0 for all, so original iteration order is preserved
    expect(result.current.filteredParks).toHaveLength(3);
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

  describe("getCurrentFilters", () => {
    it("serialises default state with selectedState as null", () => {
      const { result } = renderHook(() =>
        useFilteredParks({ parks: mockParks }),
      );

      expect(result.current.getCurrentFilters()).toEqual({
        selectedState: null,
        selectedTerrains: [],
        selectedAmenities: [],
        selectedCamping: [],
        selectedVehicleTypes: [],
        minTrailMiles: 0,
        minAcres: 0,
        minRating: "",
        selectedOwnership: "",
        permitRequired: "",
        membershipRequired: "",
        flagsRequired: "",
        sparkArrestorRequired: "",
      });
    });

    it("reflects the current panel state after filters are set", () => {
      const { result } = renderHook(() =>
        useFilteredParks({ parks: mockParks }),
      );

      act(() => {
        result.current.setSelectedState("California");
        result.current.setSelectedTerrains(["sand", "rocks"]);
        result.current.setSelectedAmenities(["restrooms"]);
        result.current.setSelectedCamping(["tent"]);
        result.current.setSelectedVehicleTypes(["atv"]);
        result.current.setMinTrailMiles(25);
        result.current.setMinAcres(500);
        result.current.setMinRating("4");
        result.current.setSelectedOwnership("public");
        result.current.setPermitRequired("yes");
        result.current.setMembershipRequired("no");
        result.current.setFlagsRequired("yes");
        result.current.setSparkArrestorRequired("no");
      });

      expect(result.current.getCurrentFilters()).toEqual({
        selectedState: "California",
        selectedTerrains: ["sand", "rocks"],
        selectedAmenities: ["restrooms"],
        selectedCamping: ["tent"],
        selectedVehicleTypes: ["atv"],
        minTrailMiles: 25,
        minAcres: 500,
        minRating: "4",
        selectedOwnership: "public",
        permitRequired: "yes",
        membershipRequired: "no",
        flagsRequired: "yes",
        sparkArrestorRequired: "no",
      });
    });

    it("does not include ephemeral searchQuery or sortOption", () => {
      const { result } = renderHook(() =>
        useFilteredParks({ parks: mockParks }),
      );

      act(() => {
        result.current.setSearchQuery("rocky");
        result.current.setSortOption("rating");
      });

      const snapshot = result.current.getCurrentFilters();
      expect(snapshot).not.toHaveProperty("searchQuery");
      expect(snapshot).not.toHaveProperty("sortOption");
    });
  });

  describe("applyFilters", () => {
    it("replaces the panel state with the supplied saved filters", () => {
      const { result } = renderHook(() =>
        useFilteredParks({ parks: mockParks }),
      );

      act(() => {
        result.current.applyFilters({
          selectedState: "Colorado",
          selectedTerrains: ["mud"],
          selectedAmenities: ["fuel"],
          selectedCamping: [],
          selectedVehicleTypes: ["sxs"],
          minTrailMiles: 50,
          minAcres: 1000,
          minRating: "3",
          selectedOwnership: "public",
          permitRequired: "yes",
          membershipRequired: "",
          flagsRequired: "no",
          sparkArrestorRequired: "yes",
        });
      });

      expect(result.current.selectedState).toBe("Colorado");
      expect(result.current.selectedTerrains).toEqual(["mud"]);
      expect(result.current.selectedAmenities).toEqual(["fuel"]);
      expect(result.current.selectedCamping).toEqual([]);
      expect(result.current.selectedVehicleTypes).toEqual(["sxs"]);
      expect(result.current.minTrailMiles).toBe(50);
      expect(result.current.minAcres).toBe(1000);
      expect(result.current.minRating).toBe("3");
      expect(result.current.selectedOwnership).toBe("public");
      expect(result.current.permitRequired).toBe("yes");
      expect(result.current.membershipRequired).toBe("");
      expect(result.current.flagsRequired).toBe("no");
      expect(result.current.sparkArrestorRequired).toBe("yes");
    });

    it("narrows the filtered park list after applyFilters", () => {
      const { result } = renderHook(() =>
        useFilteredParks({ parks: mockParks }),
      );

      // Apply only a state + terrain filter (no required fields) so we can
      // assert the filter pipeline picked up the new state.
      act(() => {
        result.current.applyFilters({
          selectedState: "Colorado",
          selectedTerrains: ["mud"],
          selectedAmenities: [],
          selectedCamping: [],
          selectedVehicleTypes: [],
          minTrailMiles: 0,
          minAcres: 0,
          minRating: "",
          selectedOwnership: "",
          permitRequired: "",
          membershipRequired: "",
          flagsRequired: "",
          sparkArrestorRequired: "",
        });
      });

      expect(result.current.filteredParks.map((p) => p.id)).toEqual(["park-2"]);
    });

    it("treats null selectedState as 'no state filter' (undefined)", () => {
      const { result } = renderHook(() =>
        useFilteredParks({ parks: mockParks }),
      );

      act(() => {
        result.current.setSelectedState("California");
      });
      expect(result.current.selectedState).toBe("California");

      act(() => {
        result.current.applyFilters({
          selectedState: null,
          selectedTerrains: [],
          selectedAmenities: [],
          selectedCamping: [],
          selectedVehicleTypes: [],
          minTrailMiles: 0,
          minAcres: 0,
          minRating: "",
          selectedOwnership: "",
          permitRequired: "",
          membershipRequired: "",
          flagsRequired: "",
          sparkArrestorRequired: "",
        });
      });

      expect(result.current.selectedState).toBeUndefined();
    });

    it("round-trips through getCurrentFilters/applyFilters without changes", () => {
      const { result } = renderHook(() =>
        useFilteredParks({ parks: mockParks }),
      );

      act(() => {
        result.current.setSelectedState("California");
        result.current.setSelectedTerrains(["sand"]);
        result.current.setMinTrailMiles(10);
        result.current.setPermitRequired("yes");
      });

      const snapshot = result.current.getCurrentFilters();

      act(() => {
        result.current.clearAllFilters();
      });
      expect(result.current.selectedState).toBeUndefined();

      act(() => {
        result.current.applyFilters(snapshot);
      });

      expect(result.current.getCurrentFilters()).toEqual(snapshot);
    });
  });
});
