import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ALL_AMENITIES, ALL_TERRAIN_TYPES, ALL_VEHICLE_TYPES } from "@/lib/constants";

interface SearchFiltersPanelProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedState: string | undefined;
  onStateChange: (state: string | undefined) => void;
  availableStates: string[];
  selectedTerrain: string | undefined;
  onTerrainChange: (terrain: string | undefined) => void;
  selectedAmenity: string | undefined;
  onAmenityChange: (amenity: string | undefined) => void;
  selectedVehicleType: string | undefined;
  onVehicleTypeChange: (vehicleType: string | undefined) => void;
  onClearFilters: () => void;
}

export function SearchFiltersPanel({
  searchQuery,
  onSearchQueryChange,
  selectedState,
  onStateChange,
  availableStates,
  selectedTerrain,
  onTerrainChange,
  selectedAmenity,
  onAmenityChange,
  selectedVehicleType,
  onVehicleTypeChange,
  onClearFilters,
}: SearchFiltersPanelProps) {
  const handleStateChange = (value: string) => {
    onStateChange(value === "__all" ? undefined : value);
  };

  const handleTerrainChange = (value: string) => {
    onTerrainChange(value === "__all" ? undefined : value);
  };

  const handleAmenityChange = (value: string) => {
    onAmenityChange(value === "__all" ? undefined : value);
  };

  const handleVehicleTypeChange = (value: string) => {
    onVehicleTypeChange(value === "__all" ? undefined : value);
  };

  return (
    <div className="md:col-span-1 bg-white p-4 rounded-2xl shadow-sm border">
      <div className="text-sm font-semibold mb-2">Search</div>
      <Input
        placeholder="Search by name, city, state…"
        value={searchQuery}
        onChange={(e) => onSearchQueryChange(e.target.value)}
      />

      <div className="h-px bg-gray-200 my-4" />

      <div className="text-sm font-semibold mb-2">State</div>
      <Select
        onValueChange={handleStateChange}
        value={selectedState ?? "__all"}
      >
        <SelectTrigger>
          <SelectValue placeholder="All states" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">All</SelectItem>
          {availableStates.map((state) => (
            <SelectItem key={state} value={state}>
              {state}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="mt-4 text-sm font-semibold mb-2">Terrain</div>
      <Select
        onValueChange={handleTerrainChange}
        value={selectedTerrain ?? "__all"}
      >
        <SelectTrigger>
          <SelectValue placeholder="Any terrain" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">Any</SelectItem>
          {ALL_TERRAIN_TYPES.map((terrain) => (
            <SelectItem key={terrain} value={terrain}>
              {terrain}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="mt-4 text-sm font-semibold mb-2">Amenities</div>
      <Select
        onValueChange={handleAmenityChange}
        value={selectedAmenity ?? "__all"}
      >
        <SelectTrigger>
          <SelectValue placeholder="Any amenity" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">Any</SelectItem>
          {ALL_AMENITIES.map((amenity) => (
            <SelectItem key={amenity} value={amenity}>
              {amenity}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="mt-4 text-sm font-semibold mb-2">Vehicle Type</div>
      <Select
        onValueChange={handleVehicleTypeChange}
        value={selectedVehicleType ?? "__all"}
      >
        <SelectTrigger>
          <SelectValue placeholder="Any vehicle" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__all">Any</SelectItem>
          {ALL_VEHICLE_TYPES.map((vehicleType) => (
            <SelectItem key={vehicleType} value={vehicleType}>
              {vehicleType === "fullSize"
                ? "Full-Size"
                : vehicleType === "sxs"
                  ? "SxS"
                  : vehicleType === "atv"
                    ? "ATV"
                    : "Motorcycle"}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <div className="mt-4 flex gap-2">
        <Button variant="secondary" onClick={onClearFilters}>
          Reset
        </Button>
      </div>

      <div className="mt-6 text-xs text-gray-500">
        Tip: Star favorites to plan a weekend loop.
      </div>
    </div>
  );
}
