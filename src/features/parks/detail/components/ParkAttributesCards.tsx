import { Card, CardContent } from "@/components/ui/card";
import { formatAmenity, formatTerrain } from "@/lib/formatting";
import type { Amenity, Park, Terrain, VehicleType } from "@/lib/types";
import {
  Anchor,
  Baby,
  Bike,
  Car,
  CarFront,
  CircleCheck,
  Droplets,
  Fish,
  Flag,
  Flame,
  Fuel,
  Gauge,
  GraduationCap,
  Map,
  Mountain,
  MountainSnow,
  Plus,
  Route,
  Ship,
  ShoppingBag,
  ShowerHead,
  Store,
  Toilet,
  Truck,
  Umbrella,
  Utensils,
  Waves,
  Wifi,
  Wrench,
} from "lucide-react";

type IconComponent = React.ComponentType<{ className?: string }>;

const TERRAIN_ICONS: Record<Terrain, IconComponent> = {
  sand: Waves,
  rocks: Mountain,
  mud: Droplets,
  trails: Route,
  hills: MountainSnow,
  motocrossTrack: Flag,
};

const VEHICLE_ICONS: Record<VehicleType, IconComponent> = {
  motorcycle: Bike,
  atv: Car,
  sxs: CarFront,
  fullSize: Truck,
};

const VEHICLE_LABELS: Record<VehicleType, string> = {
  motorcycle: "Motorcycle",
  atv: "ATV",
  sxs: "SxS",
  fullSize: "Full-Size",
};

const AMENITY_ICONS: Record<Amenity, IconComponent> = {
  restrooms: Toilet,
  showers: ShowerHead,
  food: Utensils,
  fuel: Fuel,
  repair: Wrench,
  boatRamp: Anchor,
  loadingRamp: Ship,
  picnicTable: CircleCheck,
  shelter: Umbrella,
  grill: Flame,
  playground: Baby,
  wifi: Wifi,
  fishing: Fish,
  airStation: Gauge,
  trailMaps: Map,
  rentals: ShoppingBag,
  training: GraduationCap,
  firstAid: Plus,
  store: Store,
};

interface ParkAttributesCardsProps {
  park: Park;
}

function AttrChip({
  icon: Icon,
  label,
}: {
  icon: IconComponent;
  label: string;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/40 px-2.5 py-1 text-xs font-medium">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      {label}
    </span>
  );
}

function AttrRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5 sm:flex-row sm:items-baseline sm:gap-3">
      <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground sm:w-20 sm:shrink-0 sm:pt-0.5">
        {label}
      </span>
      <div className="flex flex-wrap gap-1.5">{children}</div>
    </div>
  );
}

/**
 * Compact "at a glance" strip for a park's terrain, allowed vehicles, and
 * amenities. Replaces three full-width single-badge cards with one slim card of
 * labeled icon-chip rows, reclaiming vertical space in the Overview column. Each
 * row hides when empty; the whole card hides when the park has none of these.
 */
export function ParkAttributesCards({ park }: ParkAttributesCardsProps) {
  const hasAny =
    park.terrain.length > 0 ||
    park.vehicleTypes.length > 0 ||
    park.amenities.length > 0;

  if (!hasAny) return null;

  return (
    <Card>
      <CardContent className="space-y-3 py-4">
        {park.terrain.length > 0 && (
          <AttrRow label="Terrain">
            {park.terrain.map((terrain) => (
              <AttrChip
                key={terrain}
                icon={TERRAIN_ICONS[terrain as Terrain] ?? CircleCheck}
                label={formatTerrain(terrain as Terrain)}
              />
            ))}
          </AttrRow>
        )}

        {park.vehicleTypes.length > 0 && (
          <AttrRow label="Vehicles">
            {park.vehicleTypes.map((vehicleType) => (
              <AttrChip
                key={vehicleType}
                icon={VEHICLE_ICONS[vehicleType as VehicleType] ?? CircleCheck}
                label={VEHICLE_LABELS[vehicleType as VehicleType] ?? vehicleType}
              />
            ))}
          </AttrRow>
        )}

        {park.amenities.length > 0 && (
          <AttrRow label="Amenities">
            {park.amenities.map((amenity) => (
              <AttrChip
                key={amenity}
                icon={AMENITY_ICONS[amenity as Amenity] ?? CircleCheck}
                label={formatAmenity(amenity as Amenity)}
              />
            ))}
          </AttrRow>
        )}
      </CardContent>
    </Card>
  );
}
