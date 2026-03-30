"use client";

import { Filter, Locate, LocateFixed, Search } from "lucide-react";
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

interface SearchHeaderProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  sortOption: SortOption;
  onSortChange: (option: SortOption) => void;
  locationActive?: boolean;
  locationLoading?: boolean;
  onUseMyLocation?: () => void;
  onClearLocation?: () => void;
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
}: SearchHeaderProps) {
  const handleSortChange = (value: string) => {
    onSortChange(value as SortOption);
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-4">
      <div className="bg-card p-3 rounded-lg shadow-sm border flex items-center gap-4">
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
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Select onValueChange={handleSortChange} value={sortOption}>
            <SelectTrigger className="w-40">
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
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
