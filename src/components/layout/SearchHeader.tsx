"use client";

import { useEffect, useRef, useState } from "react";
import { Filter, Loader2, Locate, LocateFixed, MapPin, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { GeocodeResult } from "@/lib/geocode-client";
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
  /** Resolve a typed location (city/zip) to coords via /api/geocode. Used as
      the free-text fallback when the user submits without picking a suggestion. */
  onLocationSearch?: (query: string) => void;
  /** Fetch as-you-type location suggestions for the autocomplete dropdown.
      When omitted, the location input stays a plain submit-to-search box. */
  onLocationSuggest?: (query: string) => Promise<GeocodeResult[]>;
  /** User picked a suggestion — coords are already known, so no re-geocode. */
  onLocationSelect?: (result: GeocodeResult) => void;
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
  onLocationSuggest,
  onLocationSelect,
  radiusMiles,
  onRadiusChange,
  onOpenFilters,
}: SearchHeaderProps) {
  const [locationQuery, setLocationQuery] = useState("");
  const [suggestions, setSuggestions] = useState<GeocodeResult[]>([]);
  const [activeSuggestion, setActiveSuggestion] = useState(-1);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const locationBoxRef = useRef<HTMLFormElement | null>(null);

  const handleSortChange = (value: string) => {
    onSortChange(value as SortOption);
  };

  const clearSuggestions = () => {
    setSuggestions([]);
    setActiveSuggestion(-1);
    setShowSuggestions(false);
  };

  // Debounced suggestion fetch — mirrors the map route planner's custom-stop
  // search (350ms, min 2 chars). No-ops when no suggest handler is wired.
  const handleLocationChange = (value: string) => {
    setLocationQuery(value);
    setActiveSuggestion(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!onLocationSuggest || value.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSuggesting(false);
      return;
    }
    setIsSuggesting(true);
    setShowSuggestions(true);
    debounceRef.current = setTimeout(async () => {
      const results = await onLocationSuggest(value.trim());
      setSuggestions(results);
      setIsSuggesting(false);
    }, 350);
  };

  const selectSuggestion = (result: GeocodeResult) => {
    setLocationQuery(result.placeName);
    clearSuggestions();
    onLocationSelect?.(result);
  };

  const handleLocationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Enter with a highlighted suggestion picks it; otherwise fall back to a
    // free-text geocode of whatever was typed.
    if (activeSuggestion >= 0 && suggestions[activeSuggestion]) {
      selectSuggestion(suggestions[activeSuggestion]);
      return;
    }
    const q = locationQuery.trim();
    if (!q) return;
    clearSuggestions();
    onLocationSearch?.(q);
  };

  const handleLocationKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveSuggestion((i) => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveSuggestion((i) => Math.max(i - 1, -1));
    } else if (e.key === "Escape") {
      clearSuggestions();
    }
  };

  // Clear the pending debounce on unmount.
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  // Close the dropdown on an outside click.
  useEffect(() => {
    if (!showSuggestions) return;
    const handler = (e: MouseEvent) => {
      if (
        locationBoxRef.current &&
        !locationBoxRef.current.contains(e.target as Node)
      ) {
        clearSuggestions();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [showSuggestions]);

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
          {/* Manual location entry — as-you-type suggestions resolve to coords,
              matching the map route planner's custom-stop search. */}
          <form
            onSubmit={handleLocationSubmit}
            className="relative hidden md:block"
            ref={locationBoxRef}
          >
            <MapPin className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              placeholder="City or ZIP…"
              aria-label="Search by location"
              value={locationQuery}
              onChange={(e) => handleLocationChange(e.target.value)}
              onKeyDown={handleLocationKeyDown}
              onFocus={() => {
                if (suggestions.length > 0) setShowSuggestions(true);
              }}
              autoComplete="off"
              role="combobox"
              aria-expanded={showSuggestions && suggestions.length > 0}
              aria-autocomplete="list"
              className="pl-8 h-9 w-32 lg:w-40"
            />
            {isSuggesting && (
              <Loader2 className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 animate-spin text-muted-foreground" />
            )}
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-50 left-0 mt-1 w-64 max-w-[calc(100vw-3rem)] bg-popover border border-border rounded-md shadow-md overflow-hidden text-sm">
                {suggestions.map((s, i) => (
                  <li key={`${s.lat}-${s.lng}`}>
                    <button
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectSuggestion(s);
                      }}
                      className={`w-full text-left px-3 py-2 hover:bg-accent hover:text-accent-foreground transition ${
                        activeSuggestion === i
                          ? "bg-accent text-accent-foreground"
                          : ""
                      }`}
                    >
                      <span className="font-medium truncate block">
                        {s.placeName.split(",")[0]}
                      </span>
                      <span className="text-xs text-muted-foreground truncate block">
                        {s.placeName.split(",").slice(1).join(",").trim()}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            {showSuggestions &&
              !isSuggesting &&
              onLocationSuggest &&
              locationQuery.trim().length >= 2 &&
              suggestions.length === 0 && (
                <div className="absolute z-50 left-0 mt-1 w-64 max-w-[calc(100vw-3rem)] bg-popover border border-border rounded-md shadow-md px-3 py-2 text-xs text-muted-foreground">
                  No results found
                </div>
              )}
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
