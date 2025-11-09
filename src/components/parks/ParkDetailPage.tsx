"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Park } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";
import {
  ArrowLeft,
  ExternalLink,
  MapPin,
  Phone,
  DollarSign,
  Mountain,
  Gauge,
} from "lucide-react";

// Dynamically import map to avoid SSR issues
const MapView = dynamic(
  () => import("@/components/parks/MapView").then((mod) => mod.MapView),
  { ssr: false },
);

interface ParkDetailPageProps {
  park: Park;
}

export function ParkDetailPage({ park }: ParkDetailPageProps) {
  const router = useRouter();

  const handleBack = () => {
    router.push("/");
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <Button variant="ghost" onClick={handleBack} className="mb-2">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Parks
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{park.name}</h1>
          <div className="flex items-center gap-2 text-gray-600 mt-2">
            <MapPin className="w-4 h-4" />
            <span>
              {park.city ? `${park.city}, ` : ""}
              {park.state}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Overview Card */}
            <Card>
              <CardHeader>
                <CardTitle>Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {park.notes && <p className="text-gray-700">{park.notes}</p>}

                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-start gap-3">
                    <Mountain className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">Trail Miles</div>
                      <div className="font-semibold">
                        {park.milesOfTrails ?? "—"}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <DollarSign className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">Day Pass</div>
                      <div className="font-semibold">
                        {formatCurrency(park.dayPassUSD)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Gauge className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">Acres</div>
                      <div className="font-semibold">{park.acres ?? "—"}</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <Mountain className="w-5 h-5 text-gray-500 mt-0.5" />
                    <div>
                      <div className="text-sm text-gray-500">UTV Allowed</div>
                      <div className="font-semibold">
                        {park.utvAllowed ? "Yes" : "No"}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Terrain Card */}
            <Card>
              <CardHeader>
                <CardTitle>Terrain Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {park.terrain.map((terrain) => (
                    <Badge
                      key={terrain}
                      variant="outline"
                      className="capitalize text-sm"
                    >
                      {terrain}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Difficulty Card */}
            <Card>
              <CardHeader>
                <CardTitle>Difficulty Levels</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {park.difficulty.map((level) => (
                    <Badge
                      key={level}
                      variant="secondary"
                      className="capitalize text-sm"
                    >
                      {level}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Amenities Card */}
            <Card>
              <CardHeader>
                <CardTitle>Amenities</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {park.amenities.map((amenity) => (
                    <Badge key={amenity} className="capitalize text-sm">
                      {amenity}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Map Card */}
            {park.coords && (
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96 rounded-lg overflow-hidden">
                    <MapView parks={[park]} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Contact & Links</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {park.website && (
                  <a
                    href={park.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Official Website
                  </a>
                )}

                {park.phone && (
                  <div className="flex items-center gap-2 text-gray-700">
                    <Phone className="w-4 h-4" />
                    <a href={`tel:${park.phone}`} className="hover:underline">
                      {park.phone}
                    </a>
                  </div>
                )}

                {park.coords && (
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${park.coords.lat},${park.coords.lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-blue-600 hover:underline"
                  >
                    <MapPin className="w-4 h-4" />
                    Get Directions
                  </a>
                )}

                <div className="pt-4 border-t text-xs text-gray-500">
                  Always verify hours, passes, and vehicle regulations before
                  visiting.
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
