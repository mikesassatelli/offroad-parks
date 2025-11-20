"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import { SessionProvider, useSession } from "next-auth/react";
import type { Park } from "@/lib/types";
import { useFilteredParks } from "@/hooks/useFilteredParks";
import { useFavorites } from "@/hooks/useFavorites";
import { useRouteBuilder } from "@/hooks/useRouteBuilder";
import { AppHeader } from "@/components/layout/AppHeader";
import { SearchHeader } from "@/components/layout/SearchHeader";
import { SearchFiltersPanel } from "@/components/parks/SearchFiltersPanel";
import { ParkCard } from "@/components/parks/ParkCard";
import { RouteList } from "@/features/route-planner/RouteList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, Map } from "lucide-react";

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(
  () => import("@/features/map/MapView").then((mod) => mod.MapView),
  { ssr: false },
);

interface OffroadParksAppProps {
  parks: Park[];
}

function OffroadParksAppInner({ parks }: OffroadParksAppProps) {
  const { data: session } = useSession();
  const [activeView, setActiveView] = useState<"list" | "map">("list");

  const {
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
  } = useFilteredParks({ parks });

  const { toggleFavorite, isFavorite } = useFavorites();

  const {
    routeParks,
    addParkToRoute,
    removeParkFromRoute,
    clearRoute,
    reorderRoute,
    isParkInRoute,
    totalRouteDistance,
  } = useRouteBuilder();

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        // @ts-expect-error - role added in auth callback
        role: session.user.role,
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky header */}
      <div className="sticky top-0 z-20">
        <AppHeader user={user} />
      </div>

      {/* Search and sort bar */}
      <SearchHeader
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        sortOption={sortOption}
        onSortChange={setSortOption}
      />

      <main className="max-w-7xl mx-auto px-6 pb-8">
        <div className="grid lg:grid-cols-5 gap-6 items-start">
          <SearchFiltersPanel
            selectedState={selectedState}
            onStateChange={setSelectedState}
            availableStates={availableStates}
            selectedTerrains={selectedTerrains}
            onTerrainsChange={setSelectedTerrains}
            selectedAmenities={selectedAmenities}
            onAmenitiesChange={setSelectedAmenities}
            selectedCamping={selectedCamping}
            onCampingChange={setSelectedCamping}
            selectedVehicleTypes={selectedVehicleTypes}
            onVehicleTypesChange={setSelectedVehicleTypes}
            minTrailMiles={minTrailMiles}
            onMinTrailMilesChange={setMinTrailMiles}
            maxTrailMiles={maxTrailMiles}
            minAcres={minAcres}
            onMinAcresChange={setMinAcres}
            maxAcres={maxAcres}
            minRating={minRating}
            onMinRatingChange={setMinRating}
            onClearFilters={clearAllFilters}
          />

          <div className="lg:col-span-4">
            <Tabs
              value={activeView}
              onValueChange={(v) => setActiveView(v as "list" | "map")}
            >
              <TabsList className="mb-6">
                <TabsTrigger value="list" className="flex items-center gap-2">
                  <LayoutGrid className="w-4 h-4" />
                  List View
                </TabsTrigger>
                <TabsTrigger value="map" className="flex items-center gap-2">
                  <Map className="w-4 h-4" />
                  Map View
                </TabsTrigger>
              </TabsList>

              <TabsContent value="list" className="mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
                  {filteredParks.map((park) => (
                    <ParkCard
                      key={park.id}
                      park={park}
                      isFavorite={isFavorite(park.id)}
                      onToggleFavorite={toggleFavorite}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="map" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <MapView
                      parks={filteredParks}
                      routeParks={routeParks}
                      onAddToRoute={addParkToRoute}
                      isParkInRoute={isParkInRoute}
                    />
                  </div>
                  <div className="lg:col-span-1">
                    <RouteList
                      routeParks={routeParks}
                      onRemovePark={removeParkFromRoute}
                      onClearRoute={clearRoute}
                      onReorderRoute={reorderRoute}
                      totalDistance={totalRouteDistance()}
                    />
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </main>
    </div>
  );
}

export default function OffroadParksApp(props: OffroadParksAppProps) {
  return (
    <SessionProvider>
      <OffroadParksAppInner {...props} />
    </SessionProvider>
  );
}
