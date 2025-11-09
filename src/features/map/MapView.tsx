"use client";

import { useMemo } from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import type { Park } from "@/lib/types";
import { MapBoundsHandler } from "./components/MapBoundsHandler";
import { ParkMarker } from "./components/ParkMarker";
import { RoutePolylines } from "./components/RoutePolylines";
import "./utils/markers"; // Initialize marker icons
import "leaflet/dist/leaflet.css";

interface MapViewProps {
  parks: Park[];
  routeParks?: Park[];
  onAddToRoute?: (park: Park) => void;
  isParkInRoute?: (parkId: string) => boolean;
}

export function MapView({
  parks,
  routeParks = [],
  onAddToRoute,
  isParkInRoute,
}: MapViewProps) {
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
    <div className="h-[calc(100vh-12rem)] w-full rounded-2xl overflow-hidden border shadow-sm">
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
        <MapBoundsHandler parks={parksWithCoordinates} />

        {/* Draw route lines between parks with distance labels */}
        <RoutePolylines routeParks={routeParks} />

        {/* Render park markers */}
        {parksWithCoordinates.map((park) => {
          const isInRoute = isParkInRoute?.(park.id) ?? false;
          const routeIndex = routeParks.findIndex((p) => p.id === park.id);

          return (
            <ParkMarker
              key={park.id}
              park={park}
              isInRoute={isInRoute}
              routeIndex={routeIndex}
              onAddToRoute={onAddToRoute}
            />
          );
        })}
      </MapContainer>
      {parksWithCoordinates.length < parks.length && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-md text-sm text-gray-600 z-[1000]">
          Showing {parksWithCoordinates.length} of {parks.length} parks with
          coordinates
        </div>
      )}
    </div>
  );
}
