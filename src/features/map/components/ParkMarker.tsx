import { Marker, Popup } from "react-leaflet";
import type { Park } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";
import Link from "next/link";

interface ParkMarkerProps {
  park: Park;
  isInRoute: boolean;
  routeIndex: number;
  onAddToRoute?: (park: Park) => void;
}

export function ParkMarker({
  park,
  isInRoute,
  routeIndex,
  onAddToRoute,
}: ParkMarkerProps) {
  if (!park.coords) return null;

  return (
    <Marker key={park.id} position={[park.coords.lat, park.coords.lng]}>
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
            {park.address.city ? `${park.address.city}, ` : ""}
            {park.address.state}
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
              <span className="text-gray-500">Acres:</span> {park.acres ?? "—"}
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
}
