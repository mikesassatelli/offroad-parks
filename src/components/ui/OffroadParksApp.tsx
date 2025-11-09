"use client";
import { useState } from "react";
import type { Park } from "@/lib/types";
import { useFilteredParks } from "@/hooks/useFilteredParks";
import { useFavorites } from "@/hooks/useFavorites";
import { AppHeader } from "@/components/layout/AppHeader";
import { SearchFiltersPanel } from "@/components/parks/SearchFiltersPanel";
import { ParkCard } from "@/components/parks/ParkCard";
import { ParkDetailsDialog } from "@/components/parks/ParkDetailsDialog";

export default function OffroadParksApp() {
  const [selectedPark, setSelectedPark] = useState<Park | null>(null);

  const {
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
  } = useFilteredParks();

  const { toggleFavorite, isFavorite } = useFavorites();

  const handleCloseDialog = () => {
    setSelectedPark(null);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader sortOption={sortOption} onSortChange={setSortOption} />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid md:grid-cols-4 gap-4 items-start">
          <SearchFiltersPanel
            searchQuery={searchQuery}
            onSearchQueryChange={setSearchQuery}
            selectedState={selectedState}
            onStateChange={setSelectedState}
            availableStates={availableStates}
            selectedTerrain={selectedTerrain}
            onTerrainChange={setSelectedTerrain}
            selectedAmenity={selectedAmenity}
            onAmenityChange={setSelectedAmenity}
            onClearFilters={clearAllFilters}
          />

          <div className="md:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredParks.map((park) => (
              <ParkCard
                key={park.id}
                park={park}
                isFavorite={isFavorite(park.id)}
                onToggleFavorite={toggleFavorite}
                onCardClick={setSelectedPark}
              />
            ))}
          </div>
        </div>
      </main>

      <ParkDetailsDialog
        park={selectedPark}
        isOpen={!!selectedPark}
        onClose={handleCloseDialog}
      />
    </div>
  );
}
