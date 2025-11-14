import { useMemo, useState } from "react";
import type { Park } from "@/lib/types";

export type SortOption = "name" | "price" | "miles";

interface UseFilteredParksProps {
  parks: Park[];
}

export function useFilteredParks({ parks }: UseFilteredParksProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<string | undefined>();
  const [selectedTerrains, setSelectedTerrains] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState<string[]>([]);
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

    // Apply terrain filter (multi-select - park must have at least one selected terrain)
    if (selectedTerrains.length > 0) {
      filteredList = filteredList.filter((park) =>
        park.terrain.some((t) => selectedTerrains.includes(t)),
      );
    }

    // Apply amenity filter (multi-select - park must have at least one selected amenity)
    if (selectedAmenities.length > 0) {
      filteredList = filteredList.filter((park) =>
        park.amenities.some((a) => selectedAmenities.includes(a)),
      );
    }

    // Apply vehicle type filter (multi-select - park must have at least one selected vehicle type)
    if (selectedVehicleTypes.length > 0) {
      filteredList = filteredList.filter((park) =>
        park.vehicleTypes.some((v) => selectedVehicleTypes.includes(v)),
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
    selectedTerrains,
    selectedAmenities,
    selectedVehicleTypes,
    sortOption,
  ]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedState(undefined);
    setSelectedTerrains([]);
    setSelectedAmenities([]);
    setSelectedVehicleTypes([]);
  };

  return {
    searchQuery,
    setSearchQuery,
    selectedState,
    setSelectedState,
    selectedTerrains,
    setSelectedTerrains,
    selectedAmenities,
    setSelectedAmenities,
    selectedVehicleTypes,
    setSelectedVehicleTypes,
    sortOption,
    setSortOption,
    availableStates,
    filteredParks,
    clearAllFilters,
  };
}
