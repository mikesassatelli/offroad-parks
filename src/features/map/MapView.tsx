"use client";

import { useMemo, useState } from "react";
import { MapContainer, TileLayer, useMapEvents } from "react-leaflet";
import type { Park, RouteWaypoint } from "@/lib/types";
import { MapBoundsHandler } from "./components/MapBoundsHandler";
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
}

export function MapView({
  parks,
  routeWaypoints = [],
  routeGeometry,
  onAddToRoute,
  isParkInRoute,
  onMapClick,
  onRemoveWaypoint,
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

  return (
    <div className="h-[calc(100vh-12rem)] w-full rounded-lg overflow-hidden border shadow-sm">
      <MapContainer
        center={centerPosition}
        zoom={4}
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
              showLabel={zoomLevel >= LABEL_ZOOM_THRESHOLD}
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
