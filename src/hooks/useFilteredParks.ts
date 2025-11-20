import { useMemo, useState } from "react";
import type { Park } from "@/lib/types";

export type SortOption = "name" | "price" | "miles" | "acres" | "rating" | "difficulty-high" | "difficulty-low";

interface UseFilteredParksProps {
  parks: Park[];
}

export function useFilteredParks({ parks }: UseFilteredParksProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<string | undefined>();
  const [selectedTerrains, setSelectedTerrains] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedCamping, setSelectedCamping] = useState<string[]>([]);
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState<string[]>([]);
  const [minTrailMiles, setMinTrailMiles] = useState<number>(0);
  const [minAcres, setMinAcres] = useState<number>(0);
  const [minRating, setMinRating] = useState<string>("");
  const [sortOption, setSortOption] = useState<SortOption>("name");

  const availableStates = useMemo(
    () => Array.from(new Set(parks.map((park) => park.state))).sort(),
    [parks],
  );

  const maxTrailMiles = useMemo(() => {
    const miles = parks
      .map((park) => park.milesOfTrails)
      .filter((m): m is number => m !== undefined);
    return miles.length > 0 ? Math.max(...miles) : 500;
  }, [parks]);

  const maxAcres = useMemo(() => {
    const acres = parks
      .map((park) => park.acres)
      .filter((a): a is number => a !== undefined);
    return acres.length > 0 ? Math.max(...acres) : 10000;
  }, [parks]);

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

    // Apply camping filter (multi-select - park must have at least one selected camping type)
    if (selectedCamping.length > 0) {
      filteredList = filteredList.filter((park) =>
        park.camping.some((c) => selectedCamping.includes(c)),
      );
    }

    // Apply vehicle type filter (multi-select - park must have at least one selected vehicle type)
    if (selectedVehicleTypes.length > 0) {
      filteredList = filteredList.filter((park) =>
        park.vehicleTypes.some((v) => selectedVehicleTypes.includes(v)),
      );
    }

    // Apply trail miles filter
    if (minTrailMiles > 0) {
      filteredList = filteredList.filter(
        (park) => (park.milesOfTrails ?? 0) >= minTrailMiles,
      );
    }

    // Apply acres filter
    if (minAcres > 0) {
      filteredList = filteredList.filter(
        (park) => (park.acres ?? 0) >= minAcres,
      );
    }

    // Apply minimum rating filter
    if (minRating) {
      const minRatingValue = parseFloat(minRating);
      filteredList = filteredList.filter(
        (park) => (park.averageRating ?? 0) >= minRatingValue,
      );
    }

    // Apply sorting
    filteredList.sort((parkA, parkB) => {
      if (sortOption === "name") {
        return parkA.name.localeCompare(parkB.name);
      } else if (sortOption === "price") {
        return (parkA.dayPassUSD ?? Infinity) - (parkB.dayPassUSD ?? Infinity);
      } else if (sortOption === "miles") {
        return (parkB.milesOfTrails ?? 0) - (parkA.milesOfTrails ?? 0);
      } else if (sortOption === "acres") {
        return (parkB.acres ?? 0) - (parkA.acres ?? 0);
      } else if (sortOption === "rating") {
        return (parkB.averageRating ?? 0) - (parkA.averageRating ?? 0);
      } else if (sortOption === "difficulty-high") {
        return (parkB.averageDifficulty ?? 0) - (parkA.averageDifficulty ?? 0);
      } else {
        // sortOption === "difficulty-low"
        return (parkA.averageDifficulty ?? Infinity) - (parkB.averageDifficulty ?? Infinity);
      }
    });

    return filteredList;
  }, [
    parks,
    searchQuery,
    selectedState,
    selectedTerrains,
    selectedAmenities,
    selectedCamping,
    selectedVehicleTypes,
    minTrailMiles,
    minAcres,
    minRating,
    sortOption,
  ]);

  const clearAllFilters = () => {
    setSearchQuery("");
    setSelectedState(undefined);
    setSelectedTerrains([]);
    setSelectedAmenities([]);
    setSelectedCamping([]);
    setSelectedVehicleTypes([]);
    setMinTrailMiles(0);
    setMinAcres(0);
    setMinRating("");
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
    selectedCamping,
    setSelectedCamping,
    selectedVehicleTypes,
    setSelectedVehicleTypes,
    minTrailMiles,
    setMinTrailMiles,
    maxTrailMiles,
    minAcres,
    setMinAcres,
    maxAcres,
    minRating,
    setMinRating,
    sortOption,
    setSortOption,
    availableStates,
    filteredParks,
    clearAllFilters,
  };
}
