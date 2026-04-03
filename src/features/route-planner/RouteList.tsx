"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { RouteWaypoint, SavedRoute } from "@/lib/types";
import { useState } from "react";
import { useSession } from "next-auth/react";
import { geocodeLocation } from "@/features/map/utils/routing";
import type { RouteResult } from "@/features/map/utils/routing";
import { RouteListHeader } from "./components/RouteListHeader";
import { RouteListItem } from "./components/RouteListItem";
import { Button } from "@/components/ui/button";
import { Check, Copy, Loader2, MapPin, Search } from "lucide-react";

interface RouteListProps {
  waypoints: RouteWaypoint[];
  onRemoveWaypoint: (waypointId: string) => void;
  onClearRoute: () => void;
  onReorderRoute: (fromIndex: number, toIndex: number) => void;
  onAddCustomWaypoint: (label: string, lat: number, lng: number) => void;
  onSetWaypointIcon?: (waypointId: string, icon: string) => void;
  routeResult?: RouteResult | null;
  isRouting?: boolean;
  onSaveRoute?: (title: string, isPublic: boolean) => Promise<SavedRoute | null>;
  isSaving?: boolean;
  /** @deprecated Use waypoints */
  routeParks?: RouteWaypoint[];
  /** @deprecated Use onRemoveWaypoint */
  onRemovePark?: (id: string) => void;
  /** @deprecated Use routeResult?.distanceMi */
  totalDistance?: number;
}

export function RouteList({
  waypoints: waypointsProp,
  onRemoveWaypoint,
  onClearRoute,
  onReorderRoute,
  onAddCustomWaypoint,
  onSetWaypointIcon,
  routeResult,
  isRouting,
  onSaveRoute,
  isSaving,
  // backward compat
  routeParks,
  onRemovePark,
  totalDistance,
}: RouteListProps) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user;

  // Support legacy prop shape
  const waypoints = waypointsProp ?? routeParks ?? [];
  const handleRemove = onRemoveWaypoint ?? onRemovePark ?? (() => {});

  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  // Route title
  const [routeTitle, setRouteTitle] = useState("");

  // Custom waypoint search
  const [showCustomSearch, setShowCustomSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState<string | null>(null);

  // Save / share state
  const [savedRoute, setSavedRoute] = useState<SavedRoute | null>(null);
  const [copied, setCopied] = useState(false);

  const handleDragStart = (index: number) => setDraggedIndex(index);

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (
      draggedIndex !== null &&
      dragOverIndex !== null &&
      draggedIndex !== dragOverIndex
    ) {
      onReorderRoute(draggedIndex, dragOverIndex);
    }
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragLeave = () => setDragOverIndex(null);

  const handleCustomSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsGeocoding(true);
    setGeocodeError(null);

    const result = await geocodeLocation(searchQuery.trim());
    setIsGeocoding(false);

    if (!result) {
      setGeocodeError("No results found");
      return;
    }

    onAddCustomWaypoint(result.label, result.lat, result.lng);
    setSearchQuery("");
    setShowCustomSearch(false);
    setGeocodeError(null);
  };

  const handleSave = async () => {
    if (!onSaveRoute || !routeTitle.trim()) return;
    const saved = await onSaveRoute(routeTitle.trim(), false);
    if (saved) setSavedRoute(saved);
  };

  const handleCopyShareLink = () => {
    if (!savedRoute) return;
    const url = `${window.location.origin}/routes/share/${savedRoute.shareToken}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const distanceMi = routeResult?.distanceMi ?? totalDistance;
  const durationMin = routeResult?.durationMin;
  const hasWaypoints = waypoints.length > 0;

  return (
    <Card className="h-full">
      {hasWaypoints ? (
        <RouteListHeader
          onClearRoute={onClearRoute}
          totalDistanceMi={distanceMi}
          estimatedDurationMin={durationMin}
          isRouting={isRouting}
        />
      ) : null}
      <CardContent className="space-y-2">
        {!hasWaypoints && (
          <div className="py-2">
            <p className="text-sm font-medium mb-1">Route Planner</p>
            <p className="text-xs text-muted-foreground">
              Click &ldquo;Add to Route&rdquo; on parks, or add a custom stop below to start your trip.
            </p>
          </div>
        )}

        {/* Route title input — only shown when there are waypoints */}
        {hasWaypoints && (
          <input
            type="text"
            value={routeTitle}
            onChange={(e) => setRouteTitle(e.target.value)}
            placeholder="Name your route…"
            className="w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          />
        )}

        {/* Waypoints */}
        {waypoints.map((waypoint, index) => (
          <RouteListItem
            key={waypoint.id}
            waypoint={waypoint}
            index={index}
            isDragging={draggedIndex === index}
            isDragOver={dragOverIndex === index}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onDragLeave={handleDragLeave}
            onRemove={handleRemove}
            onSetIcon={onSetWaypointIcon}
          />
        ))}

        {/* Add Custom Stop */}
        <div className="pt-1">
          {!showCustomSearch ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => {
                setShowCustomSearch(true);
                setGeocodeError(null);
              }}
            >
              <MapPin className="w-3 h-3 mr-1" />
              Add Custom Stop
            </Button>
          ) : (
            <form onSubmit={handleCustomSearch} className="space-y-1">
              <div className="flex gap-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setGeocodeError(null);
                  }}
                  placeholder="Search a location…"
                  autoFocus
                  className="flex-1 text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
                <Button
                  type="submit"
                  size="sm"
                  variant="default"
                  disabled={isGeocoding || !searchQuery.trim()}
                  className="shrink-0"
                >
                  {isGeocoding ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Search className="w-3 h-3" />
                  )}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setShowCustomSearch(false);
                    setSearchQuery("");
                    setGeocodeError(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
              {isGeocoding && (
                <p className="text-xs text-muted-foreground">Searching…</p>
              )}
              {geocodeError && (
                <p className="text-xs text-destructive">{geocodeError}</p>
              )}
            </form>
          )}
        </div>

        {/* Save Route (authenticated, 2+ waypoints) */}
        {isAuthenticated && waypoints.length >= 2 && onSaveRoute && (
          <div className="pt-2 border-t space-y-2">
            {!savedRoute ? (
              <Button
                variant="default"
                size="sm"
                className="w-full"
                onClick={handleSave}
                disabled={isSaving || !routeTitle.trim()}
              >
                {isSaving ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                    Saving…
                  </>
                ) : (
                  "Save Route"
                )}
              </Button>
            ) : (
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={handleCopyShareLink}
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 mr-1 text-green-600" />
                    Link copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3 mr-1" />
                    Copy Share Link
                  </>
                )}
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
