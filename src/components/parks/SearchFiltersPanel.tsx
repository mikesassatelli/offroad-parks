import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  ALL_AMENITIES,
  ALL_CAMPING_TYPES,
  ALL_OWNERSHIP_TYPES,
  ALL_TERRAIN_TYPES,
  ALL_VEHICLE_TYPES,
  MIN_RATING_FILTERS,
} from "@/lib/constants";
import { formatAmenity, formatCamping, formatOwnership, formatTerrain } from "@/lib/formatting";
import type { Amenity, Camping, Terrain } from "@/lib/types";
import { ChevronDown, LogIn, Plus, RotateCcw, Star, X } from "lucide-react";

interface SearchFiltersPanelProps {
  selectedState: string | undefined;
  onStateChange: (state: string | undefined) => void;
  availableStates: string[];
  selectedTerrains: string[];
  onTerrainsChange: (terrains: string[]) => void;
  selectedAmenities: string[];
  onAmenitiesChange: (amenities: string[]) => void;
  selectedCamping: string[];
  onCampingChange: (camping: string[]) => void;
  selectedVehicleTypes: string[];
  onVehicleTypesChange: (vehicleTypes: string[]) => void;
  minTrailMiles: number;
  onMinTrailMilesChange: (miles: number) => void;
  maxTrailMiles: number;
  minAcres: number;
  onMinAcresChange: (acres: number) => void;
  maxAcres: number;
  minRating: string;
  onMinRatingChange: (rating: string) => void;
  selectedOwnership: string;
  onOwnershipChange: (ownership: string) => void;
  permitRequired: string;
  onPermitRequiredChange: (value: string) => void;
  membershipRequired: string;
  onMembershipRequiredChange: (value: string) => void;
  flagsRequired: string;
  onFlagsRequiredChange: (value: string) => void;
  sparkArrestorRequired: string;
  onSparkArrestorRequiredChange: (value: string) => void;
  onClearFilters: () => void;
  // Named filter presets. Signed-in users can save the current filters as a
  // named preset and apply/delete saved ones; signed-out users see a sign-in
  // CTA (onSignInToSave) in place of the controls.
  isAuthenticated?: boolean;
  presets?: { id: string; name: string }[];
  onApplyPreset?: (id: string) => void;
  onSavePreset?: (
    name: string,
  ) => Promise<{ ok: boolean; error?: string }> | void;
  onDeletePreset?: (id: string) => void;
  isSavingPreset?: boolean;
  onSignInToSave?: () => void;
}

function FilterSection({
  title,
  count,
  defaultOpen = false,
  children,
}: {
  title: string;
  count?: number;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  return (
    <Collapsible defaultOpen={defaultOpen} className="group/collapsible">
      <CollapsibleTrigger className="flex w-full items-center justify-between py-2 text-sm font-semibold uppercase tracking-wider text-foreground/80 hover:text-foreground transition-colors">
        <span className="flex items-center gap-2">
          {title}
          {count !== undefined && count > 0 && (
            <span className="inline-flex items-center justify-center rounded-md bg-primary/15 px-1.5 py-0.5 text-[10px] font-bold text-primary tabular-nums leading-none">
              {count}
            </span>
          )}
        </span>
        <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200 group-data-[state=open]/collapsible:rotate-180" />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapse data-[state=open]:animate-expand">
        <div className="pb-3 pt-1">
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SearchFiltersPanel({
  selectedState,
  onStateChange,
  availableStates,
  selectedTerrains,
  onTerrainsChange,
  selectedAmenities,
  onAmenitiesChange,
  selectedCamping,
  onCampingChange,
  selectedVehicleTypes,
  onVehicleTypesChange,
  minTrailMiles,
  onMinTrailMilesChange,
  maxTrailMiles,
  minAcres,
  onMinAcresChange,
  maxAcres,
  minRating,
  onMinRatingChange,
  selectedOwnership,
  onOwnershipChange,
  permitRequired,
  onPermitRequiredChange,
  membershipRequired,
  onMembershipRequiredChange,
  flagsRequired,
  onFlagsRequiredChange,
  sparkArrestorRequired,
  onSparkArrestorRequiredChange,
  onClearFilters,
  isAuthenticated = false,
  presets = [],
  onApplyPreset,
  onSavePreset,
  onDeletePreset,
  isSavingPreset = false,
  onSignInToSave,
}: SearchFiltersPanelProps) {
  const [showSaveInput, setShowSaveInput] = useState(false);
  const [presetName, setPresetName] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSavePreset = async () => {
    if (!onSavePreset) return;
    const name = presetName.trim();
    if (!name) return;
    const result = await onSavePreset(name);
    // A void return (or an ok result) means success.
    if (!result || result.ok) {
      setPresetName("");
      setShowSaveInput(false);
      setSaveError(null);
    } else {
      setSaveError(result.error ?? "Couldn't save that preset.");
    }
  };

  const handleStateChange = (value: string) => {
    onStateChange(value === "__all" ? undefined : value);
  };

  const handleMinRatingChange = (value: string) => {
    onMinRatingChange(value === "__any" ? "" : value);
  };

  const handleOwnershipChange = (value: string) => {
    onOwnershipChange(value === "__all" ? "" : value);
  };

  const handlePermitRequiredChange = (value: string) => {
    onPermitRequiredChange(value === "__any" ? "" : value);
  };

  const handleMembershipRequiredChange = (value: string) => {
    onMembershipRequiredChange(value === "__any" ? "" : value);
  };

  const handleFlagsRequiredChange = (value: string) => {
    onFlagsRequiredChange(value === "__any" ? "" : value);
  };

  const handleSparkArrestorRequiredChange = (value: string) => {
    onSparkArrestorRequiredChange(value === "__any" ? "" : value);
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

  const handleCampingToggle = (camping: string) => {
    if (selectedCamping.includes(camping)) {
      onCampingChange(selectedCamping.filter((c) => c !== camping));
    } else {
      onCampingChange([...selectedCamping, camping]);
    }
  };

  const handleVehicleTypeToggle = (vehicleType: string) => {
    if (selectedVehicleTypes.includes(vehicleType)) {
      onVehicleTypesChange(selectedVehicleTypes.filter((v) => v !== vehicleType));
    } else {
      onVehicleTypesChange([...selectedVehicleTypes, vehicleType]);
    }
  };

  const activeFilterCount =
    (selectedState ? 1 : 0) +
    selectedTerrains.length +
    selectedAmenities.length +
    selectedCamping.length +
    selectedVehicleTypes.length +
    (minTrailMiles > 0 ? 1 : 0) +
    (minAcres > 0 ? 1 : 0) +
    (minRating ? 1 : 0) +
    (selectedOwnership ? 1 : 0) +
    (permitRequired ? 1 : 0) +
    (membershipRequired ? 1 : 0) +
    (flagsRequired ? 1 : 0) +
    (sparkArrestorRequired ? 1 : 0);

  return (
    <div className="w-full bg-card p-4 rounded-lg shadow-sm border divide-y divide-border/60">
      {/* Header */}
      <div className="flex items-center justify-between pb-3">
        <h2 className="text-sm font-bold uppercase tracking-widest text-foreground">
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-2 inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-1.5 py-0.5 text-[10px] font-bold tabular-nums leading-none">
              {activeFilterCount}
            </span>
          )}
        </h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearFilters}
          className="h-7 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
        >
          <RotateCcw className="h-3 w-3" />
          Reset
        </Button>
      </div>

      {/* Filter presets */}
      <div data-testid="filter-presets" className="space-y-2 py-3">
        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Star className="h-3 w-3" />
          Presets
        </p>

        {isAuthenticated ? (
          <>
            {presets.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {presets.map((preset) => (
                  <span
                    key={preset.id}
                    className="inline-flex items-center rounded-md border border-border bg-background text-xs"
                  >
                    <button
                      type="button"
                      onClick={() => onApplyPreset?.(preset.id)}
                      className="px-2 py-1 font-medium text-foreground transition-colors hover:text-primary"
                    >
                      {preset.name}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeletePreset?.(preset.id)}
                      aria-label={`Delete preset ${preset.name}`}
                      className="py-1 pl-0.5 pr-1.5 text-muted-foreground transition-colors hover:text-destructive"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                Save your current filters as a preset to reuse them later.
              </p>
            )}

            {showSaveInput ? (
              <div className="space-y-1.5">
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={presetName}
                    onChange={(e) => {
                      setPresetName(e.target.value);
                      setSaveError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSavePreset();
                      }
                    }}
                    placeholder="Preset name…"
                    aria-label="Preset name"
                    className="flex-1 rounded-md border border-input bg-background px-2.5 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                  <Button
                    type="button"
                    size="sm"
                    className="h-7"
                    onClick={handleSavePreset}
                    disabled={isSavingPreset || !presetName.trim()}
                  >
                    Save
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="h-7"
                    onClick={() => {
                      setShowSaveInput(false);
                      setPresetName("");
                      setSaveError(null);
                    }}
                  >
                    Cancel
                  </Button>
                </div>
                {saveError && (
                  <p className="text-xs text-destructive">{saveError}</p>
                )}
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowSaveInput(true)}
                className="h-7 gap-1.5 text-xs"
              >
                <Plus className="h-3 w-3" />
                Save current filters
              </Button>
            )}
          </>
        ) : (
          <div className="space-y-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2.5">
            <p className="text-xs text-muted-foreground">
              Sign in to save your filters as presets and reuse them anytime.
            </p>
            <Button
              type="button"
              size="sm"
              onClick={onSignInToSave}
              className="h-7 gap-1.5 text-xs"
            >
              <LogIn className="h-3 w-3" />
              Sign in
            </Button>
          </div>
        )}
      </div>

      {/* State */}
      <FilterSection title="State" defaultOpen count={selectedState ? 1 : 0}>
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
      </FilterSection>

      {/* Vehicle Type */}
      <FilterSection title="Vehicle Type" defaultOpen count={selectedVehicleTypes.length}>
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
      </FilterSection>

      {/* Terrain */}
      <FilterSection title="Terrain" defaultOpen count={selectedTerrains.length}>
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
                {formatTerrain(terrain as Terrain)}
              </label>
            </div>
          ))}
        </div>
      </FilterSection>

      {/* Amenities */}
      <FilterSection title="Amenities" count={selectedAmenities.length}>
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
                {formatAmenity(amenity as Amenity)}
              </label>
            </div>
          ))}
        </div>
      </FilterSection>

      {/* Camping */}
      <FilterSection title="Camping" count={selectedCamping.length}>
        <div className="space-y-2">
          {ALL_CAMPING_TYPES.map((camping) => (
            <div key={camping} className="flex items-center space-x-2">
              <Checkbox
                id={`camping-${camping}`}
                checked={selectedCamping.includes(camping)}
                onCheckedChange={() => handleCampingToggle(camping)}
              />
              <label
                htmlFor={`camping-${camping}`}
                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
              >
                {formatCamping(camping as Camping)}
              </label>
            </div>
          ))}
        </div>
      </FilterSection>

      {/* Trail Miles */}
      <FilterSection title="Trail Miles" count={minTrailMiles > 0 ? 1 : 0}>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
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
      </FilterSection>

      {/* Acres */}
      <FilterSection title="Acres" count={minAcres > 0 ? 1 : 0}>
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
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
      </FilterSection>

      {/* Rating & Access */}
      <FilterSection title="Rating & Access">
        <div className="space-y-3">
          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1.5">Minimum Rating</div>
            <Select
              onValueChange={handleMinRatingChange}
              value={minRating || "__any"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any Rating" />
              </SelectTrigger>
              <SelectContent>
                {MIN_RATING_FILTERS.map((filter) => (
                  <SelectItem
                    key={filter.value || "__any"}
                    value={filter.value || "__any"}
                  >
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1.5">Ownership</div>
            <Select
              onValueChange={handleOwnershipChange}
              value={selectedOwnership || "__all"}
            >
              <SelectTrigger>
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all">All</SelectItem>
                {ALL_OWNERSHIP_TYPES.map((ownership) => (
                  <SelectItem key={ownership} value={ownership}>
                    {formatOwnership(ownership)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1.5">Permit Required</div>
            <Select
              onValueChange={handlePermitRequiredChange}
              value={permitRequired || "__any"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any">Any</SelectItem>
                <SelectItem value="yes">Required</SelectItem>
                <SelectItem value="no">Not Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1.5">Membership Required</div>
            <Select
              onValueChange={handleMembershipRequiredChange}
              value={membershipRequired || "__any"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any">Any</SelectItem>
                <SelectItem value="yes">Required</SelectItem>
                <SelectItem value="no">Not Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1.5">Flags Required</div>
            <Select
              onValueChange={handleFlagsRequiredChange}
              value={flagsRequired || "__any"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any">Any</SelectItem>
                <SelectItem value="yes">Required</SelectItem>
                <SelectItem value="no">Not Required</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <div className="text-xs font-medium text-muted-foreground mb-1.5">Spark Arrestor Required</div>
            <Select
              onValueChange={handleSparkArrestorRequiredChange}
              value={sparkArrestorRequired || "__any"}
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__any">Any</SelectItem>
                <SelectItem value="yes">Required</SelectItem>
                <SelectItem value="no">Not Required</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </FilterSection>
    </div>
  );
}
