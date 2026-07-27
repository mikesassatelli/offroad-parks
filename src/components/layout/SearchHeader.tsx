"use client";

import { useState } from "react";
import { Filter, Locate, LocateFixed, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { SortOption } from "@/hooks/useFilteredParks";

/** Distance-cutoff options (miles) for the radius select. */
export const RADIUS_OPTIONS = [25, 50, 100, 200] as const;

interface SearchHeaderProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  locationActive?: boolean;
  locationLoading?: boolean;
  onUseMyLocation?: () => void;
  onClearLocation?: () => void;
  /** Resolve a typed location (city/zip) to coords via /api/geocode. */
  onLocationSearch?: (query: string) => void;
  /** Current distance cutoff in miles (undefined = no cutoff). */
  radiusMiles?: number;
  onRadiusChange?: (miles: number | undefined) => void;
  /** Opens the filters sheet (mobile only — the sidebar is inline on desktop). */
  onOpenFilters?: () => void;
}

export function SearchHeader({
  searchQuery,
  onSearchQueryChange,
  sortOption,
  onSortChange,
  locationActive = false,
  locationLoading = false,
  onUseMyLocation,
  onClearLocation,
  onLocationSearch,
  radiusMiles,
  onRadiusChange,
  onOpenFilters,
}: SearchHeaderProps) {
  const [locationQuery, setLocationQuery] = useState("");

  const handleSortChange = (value: string) => {
    onSortChange(value as SortOption);
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = locationQuery.trim();
    if (!q) return;
    onLocationSearch?.(q);
  };

  const handleRadiusChange = (value: string) => {
    onRadiusChange?.(value === "__any" ? undefined : Number(value));
  };

  return (
    <div className="max-w-7xl 2xl:max-w-[1800px] 3xl:max-w-[2400px] mx-auto px-6 py-4">
      <div className="bg-card p-3 rounded-lg shadow-sm border flex items-center gap-2 sm:gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, city, state…"
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
            className="pl-10"
          />
        </div>
        <div className="flex items-center gap-2">
          {/* Manual location entry — resolves a typed city/zip to coords. */}
          <form
            onSubmit={handleLocationSubmit}
            className="relative hidden md:block"
          >
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="City or ZIP…"
              aria-label="Search by location"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              className="pl-8 h-9 w-32 lg:w-40"
            />
          </form>
          {locationActive ? (
            <Button
              variant="secondary"
              size="sm"
              onClick={onClearLocation}
              className="flex items-center gap-1.5 text-xs h-9"
              title="Clear location"
            >
              <LocateFixed className="w-3.5 h-3.5 text-primary" />
              <span className="hidden sm:inline">Near Me</span>
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="sm"
              onClick={onUseMyLocation}
              disabled={locationLoading}
              className="flex items-center gap-1.5 text-xs h-9"
              title="Use my location"
            >
              <Locate className={`w-3.5 h-3.5 ${locationLoading ? "animate-pulse" : ""}`} />
              <span className="hidden sm:inline">
                {locationLoading ? "Locating…" : "Near Me"}
              </span>
            </Button>
          )}
          {/* Distance cutoff — only meaningful once a location is active. */}
          {locationActive && (
            <Select
              onValueChange={handleRadiusChange}
              value={radiusMiles ? String(radiusMiles) : "__any"}
            >
              <SelectTrigger className="w-24 h-9" aria-label="Distance radius">
                <SelectValue placeholder="Radius" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any">Any dist.</SelectItem>
                {RADIUS_OPTIONS.map((miles) => (
                  <SelectItem key={miles} value={String(miles)}>
                    {miles} mi
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {/* Mobile filters trigger — the sidebar is inline on desktop, so this
              only appears below lg. Opens the shared filters sheet. */}
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenFilters}
            className="flex h-9 items-center gap-1.5 text-xs lg:hidden"
            aria-label="Open filters"
            title="Filters"
          >
            <Filter className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Filters</span>
          </Button>
          <Select onValueChange={handleSortChange} value={sortOption}>
            <SelectTrigger className="w-32 sm:w-40">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name (A–Z)</SelectItem>
              <SelectItem value="distance-nearest">Nearest First</SelectItem>
              <SelectItem value="price">Lowest Day Pass</SelectItem>
              <SelectItem value="miles">Most Trail Miles</SelectItem>
              <SelectItem value="acres">Most Acres</SelectItem>
              <SelectItem value="rating">Highest Rated</SelectItem>
              <SelectItem value="difficulty-high">Most Difficult</SelectItem>
              <SelectItem value="difficulty-low">Least Difficult</SelectItem>
              <SelectItem value="most-reviewed">Most Reviewed</SelectItem>
              <SelectItem value="newest">Newest</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
