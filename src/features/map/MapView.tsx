"use client";

import { useMemo, useState } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import type { Park, RouteWaypoint } from "@/lib/types";
import { MapBoundsHandler } from "./components/MapBoundsHandler";
import { MapVisibilityHandler } from "./components/MapVisibilityHandler";
import { CustomWaypointMarker } from "./components/CustomWaypointMarker";
import { ParkMarker } from "./components/ParkMarker";
import { RoutePolylines } from "./components/RoutePolylines";
import "./utils/markers"; // Initialize marker icons
import "leaflet/dist/leaflet.css";

const LABEL_ZOOM_THRESHOLD = 9;

interface MapClickHandlerProps {
  onMapClick?: (lat: number, lng: number) => void;
}

function MapClickHandler({ onMapClick }: MapClickHandlerProps) {
  useMapEvents({
    click(e) {
      onMapClick?.(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

interface ZoomTrackerProps {
  onZoomChange: (zoom: number) => void;
}

function ZoomTracker({ onZoomChange }: ZoomTrackerProps) {
  useMapEvents({
    zoomend(e) {
      onZoomChange(e.target.getZoom());
    },
    moveend(e) {
      onZoomChange(e.target.getZoom());
    },
  });
  return null;
}

interface MapViewProps {
  parks: Park[];
  routeWaypoints?: RouteWaypoint[];
  routeGeometry?: GeoJSON.LineString | null;
  onAddToRoute?: (park: Park) => void;
  isParkInRoute?: (parkId: string) => boolean;
  onMapClick?: (lat: number, lng: number) => void;
  onRemoveWaypoint?: (waypointId: string) => void;
  /**
   * Opt-in fix for the "map centered too far north" bug that occurs when the
   * map is rendered inside a Radix Tabs panel (or any container that becomes
   * visible after mount). When enabled, the map invalidates its cached
   * container size whenever the container resizes and re-centers on the
   * single provided park. Only meaningful when exactly one park with coords
   * is rendered (e.g. the park detail Location tab).
   */
  fitOnVisible?: boolean;
  /** Zoom used by `fitOnVisible` when recentering. Defaults to 8. */
  fitOnVisibleZoom?: number;
  /**
   * Override the default outer container classes. When omitted the map fills
   * a full-height-minus-header layout (used on the main `/` map view). The
   * park detail Location tab passes its own height via this prop so the map
   * respects the surrounding `Card` height.
   */
  containerClassName?: string;
  /**
   * Always render the park name label next to each marker, bypassing the
   * default `zoom >= LABEL_ZOOM_THRESHOLD` gate. Useful on single-park views
   * (e.g. the park detail Location tab) where there is no overlap risk and
   * the default starting zoom (8) is below the threshold (9), so the label
   * would otherwise never show.
   */
  alwaysShowLabel?: boolean;
}

export function MapView({
  parks,
  routeWaypoints = [],
  routeGeometry,
  onAddToRoute,
  isParkInRoute,
  onMapClick,
  onRemoveWaypoint,
  fitOnVisible = false,
  fitOnVisibleZoom = 8,
  containerClassName,
  alwaysShowLabel = false,
}: MapViewProps) {
  const [zoomLevel, setZoomLevel] = useState(4);

  const parksWithCoordinates = useMemo(
    () => parks.filter((park) => park.coords),
    [parks],
  );

  const centerPosition: [number, number] = useMemo(() => {
    if (parksWithCoordinates.length === 0) {
      return [39.8283, -98.5795]; // Center of US
    }
    const firstPark = parksWithCoordinates[0];
    return [firstPark.coords!.lat, firstPark.coords!.lng];
  }, [parksWithCoordinates]);

  const wrapperClassName =
    containerClassName ??
    "h-[calc(100vh-12rem)] w-full rounded-lg overflow-hidden border shadow-sm";

  // When `fitOnVisible` is set the caller is rendering a single-park detail
  // view inside a lazily-shown panel. We recenter on that park once the
  // container has its real dimensions. See MapVisibilityHandler for details.
  const visibilityCenter =
    fitOnVisible && parksWithCoordinates.length === 1
      ? parksWithCoordinates[0]
      : undefined;

  return (
    <div className={wrapperClassName}>
      <MapContainer
        center={centerPosition}
        zoom={fitOnVisible ? fitOnVisibleZoom : 4}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom={true}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsHandler
          parks={parksWithCoordinates}
          waypoints={routeWaypoints.length > 0 ? routeWaypoints : undefined}
        />
        {visibilityCenter && (
          <MapVisibilityHandler
            center={visibilityCenter}
            zoom={fitOnVisibleZoom}
          />
        )}
        {onMapClick && <MapClickHandler onMapClick={onMapClick} />}
        <ZoomTracker onZoomChange={setZoomLevel} />

        {/* Draw route lines between waypoints */}
        <RoutePolylines
          routeParks={routeWaypoints}
          routeGeometry={routeGeometry}
        />

        {/* Render custom waypoint markers (orange) */}
        {routeWaypoints
          .filter((w) => w.type === "custom")
          .map((waypoint) => (
            <CustomWaypointMarker
              key={waypoint.id}
              waypoint={waypoint}
              index={routeWaypoints.indexOf(waypoint)}
              onRemove={onRemoveWaypoint}
            />
          ))}

        {/* Render park markers */}
        {parksWithCoordinates.map((park) => {
          const isInRoute = isParkInRoute?.(park.id) ?? false;
          const routeWaypoint = routeWaypoints.find((w) => w.parkId === park.id);
          const routeIndex = routeWaypoint ? routeWaypoints.indexOf(routeWaypoint) : -1;

          return (
            <ParkMarker
              key={park.id}
              park={park}
              isInRoute={isInRoute}
              routeIndex={routeIndex}
              routeWaypoint={routeWaypoint}
              onAddToRoute={onAddToRoute}
              showLabel={alwaysShowLabel || zoomLevel >= LABEL_ZOOM_THRESHOLD}
            />
          );
        })}
      </MapContainer>
      {parksWithCoordinates.length < parks.length && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-card px-4 py-2 rounded-full shadow-md text-sm text-muted-foreground z-[1000]">
          Showing {parksWithCoordinates.length} of {parks.length} parks with
          coordinates
        </div>
      )}
    </div>
  );
}
