import { useMemo, useState } from "react";
import type { Amenity, Park, Terrain, VehicleType } from "@/lib/types";

export type SortOption = "name" | "price" | "miles";

interface UseFilteredParksProps {
  parks: Park[];
}

export function useFilteredParks({ parks }: UseFilteredParksProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<string | undefined>();
  const [selectedTerrain, setSelectedTerrain] = useState<string | undefined>();
  const [selectedAmenity, setSelectedAmenity] = useState<string | undefined>();
  const [selectedVehicleType, setSelectedVehicleType] = useState<string | undefined>();
  const [sortOption, setSortOption] = useState<SortOption>("name");

  const availableStates = useMemo(
    () => Array.from(new Set(parks.map((park) => park.state))).sort(),
    [parks],
  );

  const filteredParks = useMemo(() => {
    let filteredList = [...parks];

    // Apply search query filter
    if (searchQuery.trim()) {
      const searchTerm = searchQuery.toLowerCase();
      filteredList = filteredList.filter((park) =>
        [park.name, park.city, park.state, park.notes]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(searchTerm)),
      );
    }

    // Apply state filter
    if (selectedState) {
      filteredList = filteredList.filter(
        (park) => park.state === selectedState,
      );
    }

    // Apply terrain filter
    if (selectedTerrain) {
      filteredList = filteredList.filter((park) =>
        park.terrain.includes(selectedTerrain as Terrain),
      );
    }

    // Apply amenity filter
    if (selectedAmenity) {
      filteredList = filteredList.filter((park) =>
        park.amenities.includes(selectedAmenity as Amenity),
      );
    }

    // Apply vehicle type filter
    if (selectedVehicleType) {
      filteredList = filteredList.filter((park) =>
        park.vehicleTypes.includes(selectedVehicleType as VehicleType),
      );
    }

    // Apply sorting
    filteredList.sort((parkA, parkB) => {
      if (sortOption === "name") {
        return parkA.name.localeCompare(parkB.name);
      } else if (sortOption === "price") {
        return (parkA.dayPassUSD ?? Infinity) - (parkB.dayPassUSD ?? Infinity);
      } else {
        // sortOption === "miles"
        return (parkB.milesOfTrails ?? 0) - (parkA.milesOfTrails ?? 0);
      }
    });

    return filteredList;
  }, [
    parks,
    searchQuery,
    selectedState,
    selectedTerrain,
    selectedAmenity,
    selectedVehicleType,
    sortOption,
  ]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedState(undefined);
    setSelectedTerrain(undefined);
    setSelectedAmenity(undefined);
    setSelectedVehicleType(undefined);
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
    selectedVehicleType,
    setSelectedVehicleType,
    sortOption,
    setSortOption,
    availableStates,
    filteredParks,
    clearAllFilters,
  };
}
