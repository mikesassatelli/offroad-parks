"use client";
import { useState, useMemo, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { SessionProvider, useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import type { Park, SavedRoute } from "@/lib/types";
import { useFilteredParks } from "@/hooks/useFilteredParks";
import { useFavorites } from "@/hooks/useFavorites";
import { useRouteBuilder } from "@/hooks/useRouteBuilder";
import { useSearchPreferences } from "@/hooks/useSearchPreferences";
import { haversineDistance } from "@/lib/geo";
import { FILTER_QUERY_KEYS } from "@/lib/search-preferences";
import { AppHeader } from "@/components/layout/AppHeader";
import { SearchHeader } from "@/components/layout/SearchHeader";
import { SearchFiltersPanel } from "@/components/parks/SearchFiltersPanel";
import { ParkCard } from "@/components/parks/ParkCard";
import { RouteList } from "@/features/route-planner/RouteList";
import { MyRoutesOverlayPanel } from "@/features/route-planner/MyRoutesOverlayPanel";
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
  const searchParams = useSearchParams();
  const routeIdParam = searchParams?.get("routeId") ?? null;
  const viewParam = searchParams?.get("view");
  const [activeView, setActiveView] = useState<"list" | "map">(
    viewParam === "map" || routeIdParam ? "map" : "list",
  );
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

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
    getCurrentFilters,
    applyFilters,
  } = useFilteredParks({ parks, userCoords });

  const {
    preference,
    hasPreference,
    isAuthenticated,
    isSaving: isSavingPreference,
    savePreference,
  } = useSearchPreferences();

  // Auto-apply the saved default on first load — unless the URL already
  // carries filter query params, in which case the explicit URL state wins.
  const autoAppliedRef = useRef(false);
  useEffect(() => {
    if (autoAppliedRef.current) return;
    if (!preference?.filters) return;
    if (typeof window !== "undefined") {
      const search = new URLSearchParams(window.location.search);
      const urlHasFilters = FILTER_QUERY_KEYS.some((key) => search.has(key));
      if (urlHasFilters) {
        autoAppliedRef.current = true;
        return;
      }
    }
    applyFilters(preference.filters);
    autoAppliedRef.current = true;
  }, [preference, applyFilters]);

  const handleSaveAsDefault = async () => {
    await savePreference(getCurrentFilters());
  };

  const handleResetToDefault = async () => {
    if (preference?.filters) {
      applyFilters(preference.filters);
    }
  };

  const handleUseMyLocation = () => {
    if (!navigator.geolocation) return;
    setLocationLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserCoords({ lat: position.coords.latitude, lng: position.coords.longitude });
        setSortOption("distance-nearest");
        setLocationLoading(false);
      },
      () => {
        setLocationLoading(false);
      },
    );
  };

  const handleClearLocation = () => {
    setUserCoords(null);
    setSortOption("name");
  };

  const distances = useMemo(() => {
    if (!userCoords) return {} as Record<string, number | undefined>;
    return Object.fromEntries(
      filteredParks.map((park) => [
        park.id,
        park.coords
          ? haversineDistance(userCoords.lat, userCoords.lng, park.coords.lat, park.coords.lng)
          : undefined,
      ]),
    );
  }, [filteredParks, userCoords]);

  const { toggleFavorite, isFavorite } = useFavorites();

  const {
    waypoints,
    routeResult,
    isRouting,
    isSaving,
    savedRouteId,
    addParkToRoute,
    addCustomWaypoint,
    removeWaypoint,
    clearRoute,
    reorderRoute,
    isParkInRoute,
    saveRoute,
    updateRoute,
    loadRouteById,
    setWaypointIcon,
    setWaypointColor,
  } = useRouteBuilder();

  // Route title tracked here so the `?routeId=…` reopen flow can seed it from
  // the loaded route and so the PATCH/POST buttons can both use the current
  // title. The `<RouteList>` component consumes these via props.
  const [routeTitle, setRouteTitle] = useState("");

  // Saved route previewed via the "My Routes" overlay panel (map tab only).
  // Kept separate from the in-progress builder state so toggling a preview
  // doesn't mutate the user's current waypoints.
  const [previewRoute, setPreviewRoute] = useState<SavedRoute | null>(null);
  const [loadedRouteSnapshot, setLoadedRouteSnapshot] = useState<SavedRoute | null>(
    null,
  );

  // Load a saved route when `?routeId=…` is present on first mount. Scoped to
  // a ref so we don't re-fetch on every query param change.
  const loadedRouteIdRef = useRef<string | null>(null);
  useEffect(() => {
    if (!routeIdParam) return;
    if (loadedRouteIdRef.current === routeIdParam) return;
    loadedRouteIdRef.current = routeIdParam;
    (async () => {
      const loaded: SavedRoute | null = await loadRouteById(routeIdParam);
      if (loaded) {
        setRouteTitle(loaded.title);
        setActiveView("map");
        setLoadedRouteSnapshot(loaded);
      }
    })();
  }, [routeIdParam, loadRouteById]);

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
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
        locationActive={userCoords !== null}
        locationLoading={locationLoading}
        onUseMyLocation={handleUseMyLocation}
        onClearLocation={handleClearLocation}
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
            selectedOwnership={selectedOwnership}
            onOwnershipChange={setSelectedOwnership}
            permitRequired={permitRequired}
            onPermitRequiredChange={setPermitRequired}
            membershipRequired={membershipRequired}
            onMembershipRequiredChange={setMembershipRequired}
            flagsRequired={flagsRequired}
            onFlagsRequiredChange={setFlagsRequired}
            sparkArrestorRequired={sparkArrestorRequired}
            onSparkArrestorRequiredChange={setSparkArrestorRequired}
            onClearFilters={clearAllFilters}
            showSavedDefaultsControls={isAuthenticated}
            hasSavedDefault={hasPreference}
            isSavingDefault={isSavingPreference}
            onSaveAsDefault={handleSaveAsDefault}
            onResetToDefault={handleResetToDefault}
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
                      distanceMi={distances[park.id]}
                    />
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="map" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <MapView
                      parks={filteredParks}
                      routeWaypoints={waypoints}
                      routeGeometry={routeResult?.geometry}
                      savedRoutePreview={
                        previewRoute
                          ? {
                              waypoints: previewRoute.waypoints,
                              geometry: previewRoute.routeGeometry,
                            }
                          : null
                      }
                      onAddToRoute={addParkToRoute}
                      isParkInRoute={isParkInRoute}
                      onRemoveWaypoint={removeWaypoint}
                    />
                  </div>
                  <div className="lg:col-span-1">
                    {session?.user && (
                      <MyRoutesOverlayPanel
                        onSelectRoute={setPreviewRoute}
                        selectedRouteId={previewRoute?.id ?? null}
                      />
                    )}
                    <RouteList
                      waypoints={waypoints}
                      onRemoveWaypoint={removeWaypoint}
                      onClearRoute={() => {
                        clearRoute();
                        setRouteTitle("");
                      }}
                      onReorderRoute={reorderRoute}
                      onAddCustomWaypoint={addCustomWaypoint}
                      onSetWaypointIcon={setWaypointIcon}
                      onSetWaypointColor={setWaypointColor}
                      routeResult={routeResult}
                      isRouting={isRouting}
                      onSaveRoute={saveRoute}
                      onUpdateRoute={updateRoute}
                      loadedRouteId={savedRouteId}
                      loadedRoute={loadedRouteSnapshot}
                      routeTitle={routeTitle}
                      onRouteTitleChange={setRouteTitle}
                      isSaving={isSaving}
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
