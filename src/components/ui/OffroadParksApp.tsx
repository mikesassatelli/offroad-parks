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
import { useParkList, useParkMarkers } from "@/hooks/useServerParks";
import { haversineDistance } from "@/lib/geo";
import { FILTER_QUERY_KEYS } from "@/lib/search-preferences";
import { buildParkQueryString } from "@/lib/park-filters";
import type { ParkFacets, ParkPage } from "@/lib/park-query";
import { AppHeader } from "@/components/layout/AppHeader";
import { SearchHeader } from "@/components/layout/SearchHeader";
import { SearchFiltersPanel } from "@/components/parks/SearchFiltersPanel";
import { ParkCard } from "@/components/parks/ParkCard";
import { RouteList } from "@/features/route-planner/RouteList";
import { MyRoutesOverlayPanel } from "@/features/route-planner/MyRoutesOverlayPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { LayoutGrid, Loader2, Map } from "lucide-react";

// Dynamically import MapView to avoid SSR issues with Leaflet
const MapView = dynamic(
  () => import("@/features/map/MapView").then((mod) => mod.MapView),
  { ssr: false },
);

interface OffroadParksAppProps {
  /** Server-rendered first page of list parks (hero + rain decorated). */
  initialData: ParkPage;
  /** Server-rendered full filtered marker set for the map view. */
  initialMarkers: Park[];
  /** Static filter facets (states + slider bounds) over all approved parks. */
  facets: ParkFacets;
}

function OffroadParksAppInner({
  initialData,
  initialMarkers,
  facets,
}: OffroadParksAppProps) {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const routeIdParam = searchParams?.get("routeId") ?? null;
  const viewParam = searchParams?.get("view");
  const [activeView, setActiveView] = useState<"list" | "map">(
    viewParam === "map" || routeIdParam ? "map" : "list",
  );
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // The filter/sort STATE (and its setters, saved-default helpers) still live
  // in useFilteredParks so behaviour and tests are preserved. Its client-side
  // `filteredParks` output is no longer used for rendering — filtering + sorting
  // now happen server-side. We pass an empty list and source the panel facets
  // (states + slider maxes) from the server instead.
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
    minAcres,
    setMinAcres,
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
    clearAllFilters,
    getCurrentFilters,
    applyFilters,
  } = useFilteredParks({ parks: [], userCoords });

  // Serialised filter query — the single key that drives both server endpoints.
  const queryString = useMemo(
    () =>
      buildParkQueryString({
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
      }).toString(),
    [
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
    ],
  );

  const {
    parks: listParks,
    isLoading,
    isLoadingMore,
    hasMore,
    loadMore,
    error: listError,
  } = useParkList({ queryString, initialData });

  // Markers are only fetched while the map view is active. The markers hook
  // seeds from the server-rendered set and refetches when the filters differ
  // from the last load, so opening the map after changing filters re-syncs it.
  const markerParks = useParkMarkers({
    queryString,
    initialMarkers,
    enabled: activeView === "map",
  });

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

  // Distance badge on each card — computed over the currently loaded pages.
  const distances = useMemo(() => {
    if (!userCoords) return {} as Record<string, number | undefined>;
    return Object.fromEntries(
      listParks.map((park) => [
        park.id,
        park.coords
          ? haversineDistance(userCoords.lat, userCoords.lng, park.coords.lat, park.coords.lng)
          : undefined,
      ]),
    );
  }, [listParks, userCoords]);

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

  // Mobile filters live in a slide-in sheet; on desktop the sidebar is inline.
  // Close the sheet if the viewport grows to desktop so it can't linger open
  // behind the (now hidden) trigger.
  const [filtersOpen, setFiltersOpen] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const closeIfDesktop = () => {
      if (mq.matches) setFiltersOpen(false);
    };
    mq.addEventListener("change", closeIfDesktop);
    return () => mq.removeEventListener("change", closeIfDesktop);
  }, []);

  // Measure the sticky top block (app header + search bar) so the desktop
  // filters sidebar can stick directly beneath it regardless of header height.
  const stickyRef = useRef<HTMLDivElement | null>(null);
  const [stickyOffset, setStickyOffset] = useState(0);
  useEffect(() => {
    const el = stickyRef.current;
    if (!el) return;
    const update = () => setStickyOffset(el.offsetHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Infinite-scroll sentinel — loads the next page as it nears the viewport.
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) loadMore();
      },
      { rootMargin: "600px 0px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [loadMore]);

  const filtersPanel = (
    <SearchFiltersPanel
      selectedState={selectedState}
      onStateChange={setSelectedState}
      availableStates={facets.states}
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
      maxTrailMiles={facets.maxTrailMiles}
      minAcres={minAcres}
      onMinAcresChange={setMinAcres}
      maxAcres={facets.maxAcres}
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
  );

  return (
    <div className="min-h-screen bg-background">
      {/* Sticky top block: app header + search/sort bar stay pinned while the
          list scrolls. Solid background + high z-index keep cards from showing
          through. */}
      <div ref={stickyRef} className="sticky top-0 z-30 bg-background">
        <AppHeader user={user} />
        <SearchHeader
          searchQuery={searchQuery}
          onSearchQueryChange={setSearchQuery}
          sortOption={sortOption}
          onSortChange={setSortOption}
          locationActive={userCoords !== null}
          locationLoading={locationLoading}
          onUseMyLocation={handleUseMyLocation}
          onClearLocation={handleClearLocation}
          onOpenFilters={() => setFiltersOpen(true)}
        />
      </div>

      <main className="max-w-7xl 2xl:max-w-[1800px] 3xl:max-w-[2400px] mx-auto px-6 pb-8">
        {/* Mobile filters — opened by the funnel button in the search bar.
            Rendered in a slide-in sheet so it doesn't stack a full-height wall
            above the results. On desktop the sidebar below shows inline. */}
        <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
          <SheetContent
            side="left"
            className="w-[85vw] max-w-sm gap-0 overflow-y-auto p-4"
          >
            <SheetHeader className="px-0 pt-0">
              <SheetTitle>Filters</SheetTitle>
            </SheetHeader>
            {filtersPanel}
          </SheetContent>
        </Sheet>

        <div className="flex flex-col lg:flex-row gap-6 items-start">
          {/* Desktop sidebar — hidden on mobile, shown in the sheet above.
              Sticks beneath the pinned header while the list scrolls. */}
          <div
            className="hidden w-72 shrink-0 lg:block lg:sticky lg:self-start lg:max-h-[calc(100vh-1rem)] lg:overflow-y-auto"
            style={{ top: stickyOffset ? stickyOffset + 16 : undefined }}
          >
            {filtersPanel}
          </div>

          <div className="flex-1 min-w-0 w-full">
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
                {listError && (
                  <div className="mb-4 rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive">
                    {listError}
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 3xl:grid-cols-5 gap-5">
                  {listParks.map((park) => (
                    <ParkCard
                      key={park.id}
                      park={park}
                      isFavorite={isFavorite(park.id)}
                      onToggleFavorite={toggleFavorite}
                      distanceMi={distances[park.id]}
                    />
                  ))}
                </div>

                {/* Empty state — only when a completed load returned nothing. */}
                {!isLoading && listParks.length === 0 && (
                  <div className="py-16 text-center text-muted-foreground">
                    No parks match your filters.
                  </div>
                )}

                {/* Loading / infinite-scroll region */}
                {(isLoading || isLoadingMore) && (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading parks…
                  </div>
                )}

                {/* Sentinel: triggers loadMore as it approaches the viewport. */}
                {hasMore && !isLoading && (
                  <div ref={sentinelRef} className="h-1 w-full" aria-hidden />
                )}

                {/* End-of-list state */}
                {!hasMore && !isLoading && listParks.length > 0 && (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    You&rsquo;ve reached the end · {listParks.length} park
                    {listParks.length === 1 ? "" : "s"}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="map" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <MapView
                      parks={markerParks}
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
