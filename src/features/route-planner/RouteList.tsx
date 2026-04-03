"use client";

import { Card, CardContent } from "@/components/ui/card";
import type { RouteWaypoint, SavedRoute } from "@/lib/types";
import { useEffect, useRef, useState } from "react";
import { useSession } from "next-auth/react";
import { geocodeSuggestions } from "@/features/map/utils/routing";
import type { RouteResult } from "@/features/map/utils/routing";
import { RouteListHeader } from "./components/RouteListHeader";
import { RouteListItem } from "./components/RouteListItem";
import { Button } from "@/components/ui/button";
import { Check, Copy, Loader2, MapPin, X } from "lucide-react";

interface RouteListProps {
  waypoints: RouteWaypoint[];
  onRemoveWaypoint: (waypointId: string) => void;
  onClearRoute: () => void;
  onReorderRoute: (fromIndex: number, toIndex: number) => void;
  onAddCustomWaypoint: (label: string, lat: number, lng: number) => void;
  onSetWaypointIcon?: (waypointId: string, icon: string) => void;
  onSetWaypointColor?: (waypointId: string, color: string) => void;
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
  onSetWaypointColor,
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

  // Custom waypoint autocomplete search
  const [showCustomSearch, setShowCustomSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [suggestions, setSuggestions] = useState<{ label: string; lat: number; lng: number }[]>([]);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchContainerRef = useRef<HTMLDivElement>(null);

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

  const closeSearch = () => {
    setShowCustomSearch(false);
    setSearchQuery("");
    setSuggestions([]);
    setActiveSuggestion(-1);
  };

  const selectSuggestion = (s: { label: string; lat: number; lng: number }) => {
    onAddCustomWaypoint(s.label, s.lat, s.lng);
    closeSearch();
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setActiveSuggestion(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.trim().length < 2) { setSuggestions([]); setIsGeocoding(false); return; }
    setIsGeocoding(true);
    debounceRef.current = setTimeout(async () => {
      const results = await geocodeSuggestions(value.trim());
      setSuggestions(results);
      setIsGeocoding(false);
    }, 350);
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setActiveSuggestion((i) => Math.min(i + 1, suggestions.length - 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setActiveSuggestion((i) => Math.max(i - 1, -1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (activeSuggestion >= 0 && suggestions[activeSuggestion]) selectSuggestion(suggestions[activeSuggestion]); }
    else if (e.key === "Escape") closeSearch();
  };

  // Close dropdown on click outside
  useEffect(() => {
    if (!showCustomSearch) return;
    const handler = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setSuggestions([]);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showCustomSearch]);

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
            onSetColor={onSetWaypointColor}
          />
        ))}

        {/* Add Custom Stop */}
        <div className="pt-1">
          {!showCustomSearch ? (
            <Button
              variant="outline"
              size="sm"
              className="w-full text-xs"
              onClick={() => setShowCustomSearch(true)}
            >
              <MapPin className="w-3 h-3 mr-1" />
              Add Custom Stop
            </Button>
          ) : (
            <div ref={searchContainerRef} className="relative">
              <div className="flex gap-1">
                <div className="relative flex-1">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => handleSearchChange(e.target.value)}
                    onKeyDown={handleSearchKeyDown}
                    placeholder="Search a location…"
                    autoFocus
                    className="w-full text-sm border border-input rounded-md px-3 py-1.5 pr-7 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  {isGeocoding && (
                    <Loader2 className="w-3 h-3 animate-spin absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
                  )}
                </div>
                <Button type="button" size="sm" variant="ghost" onClick={closeSearch} aria-label="Cancel search">
                  <X className="w-3 h-3" />
                </Button>
              </div>
              {suggestions.length > 0 && (
                <ul className="absolute z-50 left-0 right-0 mt-1 bg-popover border border-border rounded-md shadow-md overflow-hidden text-sm">
                  {suggestions.map((s, i) => (
                    <li key={`${s.lat}-${s.lng}`}>
                      <button
                        type="button"
                        onMouseDown={(e) => { e.preventDefault(); selectSuggestion(s); }}
                        className={`w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition ${
                          activeSuggestion === i ? "bg-accent text-accent-foreground" : ""
                        }`}
                      >
                        <span className="font-medium truncate block">{s.label.split(",")[0]}</span>
                        <span className="text-xs text-muted-foreground truncate block">
                          {s.label.split(",").slice(1).join(",").trim()}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!isGeocoding && searchQuery.trim().length >= 2 && suggestions.length === 0 && (
                <p className="text-xs text-muted-foreground mt-1 px-1">No results found</p>
              )}
            </div>
          )}
        </div>

        {/* Save Route (authenticated, 2+ waypoints) */}
        {isAuthenticated && waypoints.length >= 2 && onSaveRoute && (
          <div className="pt-3 border-t space-y-2">
            {!savedRoute ? (
              <>
                <label className="block">
                  <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Route name</span>
                  <input
                    type="text"
                    value={routeTitle}
                    onChange={(e) => setRouteTitle(e.target.value)}
                    placeholder="e.g. Weekend Sand Dunes Loop"
                    className="mt-1 w-full text-sm border border-input rounded-md px-3 py-1.5 bg-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </label>
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
              </>
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
