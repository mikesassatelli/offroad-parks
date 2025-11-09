import { useMemo, useState } from "react";
import type { Amenity, Terrain } from "@/lib/types";
import { PARKS } from "@/data/parks";

export type SortOption = "name" | "price" | "miles";

export function useFilteredParks() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<string | undefined>();
  const [selectedTerrain, setSelectedTerrain] = useState<string | undefined>();
  const [selectedAmenity, setSelectedAmenity] = useState<string | undefined>();
  const [sortOption, setSortOption] = useState<SortOption>("name");

  const availableStates = useMemo(
    () => Array.from(new Set(PARKS.map((park) => park.state))).sort(),
    [],
  );

  const filteredParks = useMemo(() => {
    let parks = [...PARKS];

    // Apply search query filter
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase();
      parks = parks.filter((park) =>
        [park.name, park.city, park.state, park.notes]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(searchTerm)),
      );
    }

    // Apply state filter
    if (selectedState) {
      parks = parks.filter((park) => park.state === selectedState);
    }

    // Apply terrain filter
    if (selectedTerrain) {
      parks = parks.filter((park) =>
        park.terrain.includes(selectedTerrain as Terrain),
      );
    }

    // Apply amenity filter
    if (selectedAmenity) {
      parks = parks.filter((park) =>
        park.amenities.includes(selectedAmenity as Amenity),
      );
    }

    // Apply sorting
    parks.sort((parkA, parkB) => {
      if (sortOption === "name") {
        return parkA.name.localeCompare(parkB.name);
      }
      if (sortOption === "price") {
        return (parkA.dayPassUSD ?? Infinity) - (parkB.dayPassUSD ?? Infinity);
      }
      if (sortOption === "miles") {
        return (parkB.milesOfTrails ?? 0) - (parkA.milesOfTrails ?? 0);
      }
      return 0;
    });

    return parks;
  }, [
    searchQuery,
    selectedState,
    selectedTerrain,
    selectedAmenity,
    sortOption,
  ]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedState(undefined);
    setSelectedTerrain(undefined);
    setSelectedAmenity(undefined);
  };

  return {
    searchQuery,
    setSearchQuery,
    selectedState,
    setSelectedState,
    selectedTerrain,
    setSelectedTerrain,
    selectedAmenity,
    setSelectedAmenity,
    sortOption,
    setSortOption,
    availableStates,
    filteredParks,
    clearAllFilters,
  };
}
