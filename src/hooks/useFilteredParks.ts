import { useMemo, useState } from "react";
import type { Park } from "@/lib/types";
import { haversineDistance } from "@/lib/geo";

export type SortOption = "name" | "price" | "miles" | "acres" | "rating" | "difficulty-high" | "difficulty-low" | "most-reviewed" | "distance-nearest";

export interface UserCoords {
  lat: number;
  lng: number;
}

interface UseFilteredParksProps {
  parks: Park[];
  userCoords?: UserCoords | null;
}

export function useFilteredParks({ parks, userCoords }: UseFilteredParksProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedState, setSelectedState] = useState<string | undefined>();
  const [selectedTerrains, setSelectedTerrains] = useState<string[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);
  const [selectedCamping, setSelectedCamping] = useState<string[]>([]);
  const [selectedVehicleTypes, setSelectedVehicleTypes] = useState<string[]>([]);
  const [minTrailMiles, setMinTrailMiles] = useState<number>(0);
  const [minAcres, setMinAcres] = useState<number>(0);
  const [minRating, setMinRating] = useState<string>("");
  const [selectedOwnership, setSelectedOwnership] = useState<string>("");
  const [permitRequired, setPermitRequired] = useState<string>("");
  const [membershipRequired, setMembershipRequired] = useState<string>("");
  const [flagsRequired, setFlagsRequired] = useState<string>("");
  const [sparkArrestorRequired, setSparkArrestorRequired] = useState<string>("");
  const [sortOption, setSortOption] = useState<SortOption>("name");

  const availableStates = useMemo(
    () => Array.from(new Set(parks.map((park) => park.address.state))).sort(),
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
        [park.name, park.address.city, park.address.state, park.notes]
          .filter(Boolean)
          .some((value) => value!.toLowerCase().includes(searchTerm)),
      );
    }

    // Apply state filter
    if (selectedState) {
      filteredList = filteredList.filter(
        (park) => park.address.state === selectedState,
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

    // Filter by ownership
    if (selectedOwnership) {
      filteredList = filteredList.filter(
        (park) => park.ownership === selectedOwnership,
      );
    }

    // Filter by permit required
    if (permitRequired === "yes") {
      filteredList = filteredList.filter((park) => park.permitRequired === true);
    } else if (permitRequired === "no") {
      filteredList = filteredList.filter((park) => park.permitRequired !== true);
    }

    // Filter by membership required
    if (membershipRequired === "yes") {
      filteredList = filteredList.filter((park) => park.membershipRequired === true);
    } else if (membershipRequired === "no") {
      filteredList = filteredList.filter((park) => park.membershipRequired !== true);
    }

    // Filter by flags required
    if (flagsRequired === "yes") {
      filteredList = filteredList.filter((park) => park.flagsRequired === true);
    } else if (flagsRequired === "no") {
      filteredList = filteredList.filter((park) => park.flagsRequired !== true);
    }

    // Filter by spark arrestor required
    if (sparkArrestorRequired === "yes") {
      filteredList = filteredList.filter((park) => park.sparkArrestorRequired === true);
    } else if (sparkArrestorRequired === "no") {
      filteredList = filteredList.filter((park) => park.sparkArrestorRequired !== true);
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
      } else if (sortOption === "difficulty-low") {
        return (parkA.averageDifficulty ?? Infinity) - (parkB.averageDifficulty ?? Infinity);
      } else if (sortOption === "most-reviewed") {
        return (parkB.reviewCount ?? 0) - (parkA.reviewCount ?? 0);
      } else {
        // sortOption === "distance-nearest"
        if (!userCoords) return 0;
        const distA = parkA.coords
          ? haversineDistance(userCoords.lat, userCoords.lng, parkA.coords.lat, parkA.coords.lng)
          : Infinity;
        const distB = parkB.coords
          ? haversineDistance(userCoords.lat, userCoords.lng, parkB.coords.lat, parkB.coords.lng)
          : Infinity;
        return distA - distB;
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
    selectedOwnership,
    permitRequired,
    membershipRequired,
    flagsRequired,
    sparkArrestorRequired,
    sortOption,
    userCoords,
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
    setSelectedOwnership("");
    setPermitRequired("");
    setMembershipRequired("");
    setFlagsRequired("");
    setSparkArrestorRequired("");
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
    selectedOwnership,
    setSelectedOwnership,
    permitRequired,
    setPermitRequired,
    membershipRequired,
    setMembershipRequired,
    flagsRequired,
    setFlagsRequired,
    sparkArrestorRequired,
    setSparkArrestorRequired,
    sortOption,
    setSortOption,
    availableStates,
    filteredParks,
    clearAllFilters,
  };
}
