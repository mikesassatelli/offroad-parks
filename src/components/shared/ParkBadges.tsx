import { Badge } from "@/components/ui/badge";
import type { Amenity, Terrain } from "@/lib/types";

interface TerrainBadgesProps {
  terrain: Terrain[];
}

export function TerrainBadges({ terrain }: TerrainBadgesProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {terrain.map((t) => (
        <Badge key={t} variant="outline" className="capitalize">
          {t}
        </Badge>
      ))}
    </div>
  );
}

interface AmenityBadgesProps {
  amenities: Amenity[];
}

export function AmenityBadges({ amenities }: AmenityBadgesProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {amenities.map((amenity) => (
        <Badge key={amenity} className="capitalize" variant="secondary">
          {amenity}
        </Badge>
      ))}
    </div>
  );
}
