"use client";

import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Park } from "@/lib/types";
import { ArrowLeft, MapPin } from "lucide-react";
import { ParkOverviewCard } from "./components/ParkOverviewCard";
import { ParkAttributesCards } from "./components/ParkAttributesCards";
import { ParkContactSidebar } from "./components/ParkContactSidebar";

// Dynamically import map to avoid SSR issues
const MapView = dynamic(
  () => import("@/features/map/MapView").then((mod) => mod.MapView),
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-card/95 backdrop-blur-sm border-b border-border shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <Button variant="ghost" onClick={handleBack} className="mb-3">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Parks
          </Button>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {park.name}
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground mt-2">
            <MapPin className="w-4 h-4" />
            <span>
              {park.city ? `${park.city}, ` : ""}
              {park.state}
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <ParkOverviewCard park={park} />
            <ParkAttributesCards park={park} />

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
            <ParkContactSidebar park={park} />
          </div>
        </div>
      </main>
    </div>
  );
}
