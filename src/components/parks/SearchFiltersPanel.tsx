import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { ALL_AMENITIES, ALL_TERRAIN_TYPES, ALL_VEHICLE_TYPES } from "@/lib/constants";

interface SearchFiltersPanelProps {
  searchQuery: string;
  onSearchQueryChange: (query: string) => void;
  selectedState: string | undefined;
  onStateChange: (state: string | undefined) => void;
  availableStates: string[];
  selectedTerrains: string[];
  onTerrainsChange: (terrains: string[]) => void;
  selectedAmenities: string[];
  onAmenitiesChange: (amenities: string[]) => void;
  selectedVehicleTypes: string[];
  onVehicleTypesChange: (vehicleTypes: string[]) => void;
  minTrailMiles: number;
  onMinTrailMilesChange: (miles: number) => void;
  maxTrailMiles: number;
  minAcres: number;
  onMinAcresChange: (acres: number) => void;
  maxAcres: number;
  onClearFilters: () => void;
}

export function SearchFiltersPanel({
  searchQuery,
  onSearchQueryChange,
  selectedState,
  onStateChange,
  availableStates,
  selectedTerrains,
  onTerrainsChange,
  selectedAmenities,
  onAmenitiesChange,
  selectedVehicleTypes,
  onVehicleTypesChange,
  minTrailMiles,
  onMinTrailMilesChange,
  maxTrailMiles,
  minAcres,
  onMinAcresChange,
  maxAcres,
  onClearFilters,
}: SearchFiltersPanelProps) {
  const handleStateChange = (value: string) => {
    onStateChange(value === "__all" ? undefined : value);
  };

  const handleTerrainToggle = (terrain: string) => {
    if (selectedTerrains.includes(terrain)) {
      onTerrainsChange(selectedTerrains.filter((t) => t !== terrain));
    } else {
      onTerrainsChange([...selectedTerrains, terrain]);
    }
  };

  const handleAmenityToggle = (amenity: string) => {
    if (selectedAmenities.includes(amenity)) {
      onAmenitiesChange(selectedAmenities.filter((a) => a !== amenity));
    } else {
      onAmenitiesChange([...selectedAmenities, amenity]);
    }
  };

  const handleVehicleTypeToggle = (vehicleType: string) => {
    if (selectedVehicleTypes.includes(vehicleType)) {
      onVehicleTypesChange(selectedVehicleTypes.filter((v) => v !== vehicleType));
    } else {
      onVehicleTypesChange([...selectedVehicleTypes, vehicleType]);
    }
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

      <div className="mt-4 text-sm font-semibold mb-2">Vehicle Type</div>
      <div className="space-y-2">
        {ALL_VEHICLE_TYPES.map((vehicleType) => (
          <div key={vehicleType} className="flex items-center space-x-2">
            <Checkbox
              id={`vehicle-${vehicleType}`}
              checked={selectedVehicleTypes.includes(vehicleType)}
              onCheckedChange={() => handleVehicleTypeToggle(vehicleType)}
            />
            <label
              htmlFor={`vehicle-${vehicleType}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {vehicleType === "fullSize"
                ? "Full-Size"
                : vehicleType === "sxs"
                  ? "SxS"
                  : vehicleType === "atv"
                    ? "ATV"
                    : "Motorcycle"}
            </label>
          </div>
        ))}
      </div>

      <div className="mt-4 text-sm font-semibold mb-2">Terrain</div>
      <div className="space-y-2">
        {ALL_TERRAIN_TYPES.map((terrain) => (
          <div key={terrain} className="flex items-center space-x-2">
            <Checkbox
              id={`terrain-${terrain}`}
              checked={selectedTerrains.includes(terrain)}
              onCheckedChange={() => handleTerrainToggle(terrain)}
            />
            <label
              htmlFor={`terrain-${terrain}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {terrain}
            </label>
          </div>
        ))}
      </div>

      <div className="mt-4 text-sm font-semibold mb-2">Amenities</div>
      <div className="space-y-2">
        {ALL_AMENITIES.map((amenity) => (
          <div key={amenity} className="flex items-center space-x-2">
            <Checkbox
              id={`amenity-${amenity}`}
              checked={selectedAmenities.includes(amenity)}
              onCheckedChange={() => handleAmenityToggle(amenity)}
            />
            <label
              htmlFor={`amenity-${amenity}`}
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              {amenity}
            </label>
          </div>
        ))}
      </div>

      <div className="mt-4 text-sm font-semibold mb-2">Trail Miles</div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Min: {minTrailMiles} mi</span>
          <span>Max: {maxTrailMiles} mi</span>
        </div>
        <Slider
          value={[minTrailMiles]}
          min={0}
          max={maxTrailMiles}
          step={5}
          onValueChange={(values) => onMinTrailMilesChange(values[0])}
        />
      </div>

      <div className="mt-4 text-sm font-semibold mb-2">Acres</div>
      <div className="space-y-2">
        <div className="flex justify-between text-xs text-gray-500">
          <span>Min: {minAcres.toLocaleString()} acres</span>
          <span>Max: {maxAcres.toLocaleString()} acres</span>
        </div>
        <Slider
          value={[minAcres]}
          min={0}
          max={maxAcres}
          step={100}
          onValueChange={(values) => onMinAcresChange(values[0])}
        />
      </div>

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
