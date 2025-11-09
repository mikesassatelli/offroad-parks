"use client";

import { useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  Tooltip,
  useMap,
} from "react-leaflet";
import type { Park } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import Link from "next/link";

// Calculate distance between two coordinates using Haversine formula
function calculateDistance(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const R = 3959; // Earth's radius in miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

interface MapViewProps {
  parks: Park[];
  routeParks?: Park[];
  onAddToRoute?: (park: Park) => void;
  isParkInRoute?: (parkId: string) => boolean;
}

// Fix for default marker icons in react-leaflet
const defaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

L.Marker.prototype.options.icon = defaultIcon;

function MapBoundsHandler({ parks }: { parks: Park[] }) {
  const map = useMap();

  useEffect(() => {
    const parksWithCoords = parks.filter((park) => park.coords);

    if (parksWithCoords.length === 0) {
      // Default to center of US if no parks have coordinates
      map.setView([39.8283, -98.5795], 4);
      return;
    }

    if (parksWithCoords.length === 1) {
      const park = parksWithCoords[0];
      map.setView([park.coords!.lat, park.coords!.lng], 8);
      return;
    }

    // Fit bounds to show all parks
    const bounds = L.latLngBounds(
      parksWithCoords.map((park) => [park.coords!.lat, park.coords!.lng]),
    );
    map.fitBounds(bounds, { padding: [50, 50], maxZoom: 12 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parks.length, map]); // Only re-run when number of parks changes, not the array reference

  return null;
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
        {routeParks.length >= 2 &&
          routeParks.slice(0, -1).map((park, index) => {
            const nextPark = routeParks[index + 1];
            if (!park.coords || !nextPark.coords) return null;

            const segmentPositions: [number, number][] = [
              [park.coords.lat, park.coords.lng],
              [nextPark.coords.lat, nextPark.coords.lng],
            ];

            const distance = calculateDistance(
              park.coords.lat,
              park.coords.lng,
              nextPark.coords.lat,
              nextPark.coords.lng,
            );

            return (
              <Polyline
                key={`${park.id}-${nextPark.id}`}
                positions={segmentPositions}
                color="#3b82f6"
                weight={3}
                opacity={0.7}
                dashArray="10, 10"
              >
                <Tooltip
                  permanent
                  direction="center"
                  className="bg-white px-2 py-1 rounded shadow-md border border-blue-300 text-xs font-semibold text-blue-700"
                >
                  {distance} mi
                </Tooltip>
              </Polyline>
            );
          })}

        {parksWithCoordinates.map((park) => {
          const isInRoute = isParkInRoute?.(park.id) ?? false;
          const routeIndex = routeParks.findIndex((p) => p.id === park.id);

          return (
            <Marker
              key={park.id}
              position={[park.coords!.lat, park.coords!.lng]}
            >
              <Popup autoPan={false}>
                <div className="min-w-[200px]">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <div className="font-semibold text-base">{park.name}</div>
                    {isInRoute && (
                      <span className="inline-flex items-center justify-center w-6 h-6 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
                        {routeIndex + 1}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 mb-2">
                    {park.city ? `${park.city}, ` : ""}
                    {park.state}
                  </div>
                  <div className="text-sm space-y-1">
                    <div>
                      <span className="text-gray-500">Trail miles:</span>{" "}
                      {park.milesOfTrails ?? "—"}
                    </div>
                    <div>
                      <span className="text-gray-500">Day pass:</span>{" "}
                      {formatCurrency(park.dayPassUSD)}
                    </div>
                    <div>
                      <span className="text-gray-500">Acres:</span>{" "}
                      {park.acres ?? "—"}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2">
                    {onAddToRoute && !isInRoute && (
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          onAddToRoute(park);
                        }}
                        className="text-sm bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition cursor-pointer"
                      >
                        Add to Route
                      </button>
                    )}
                    <Link
                      href={`/parks/${park.id}`}
                      className="text-sm text-blue-600 hover:underline cursor-pointer"
                    >
                      View details →
                    </Link>
                  </div>
                </div>
              </Popup>
            </Marker>
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
