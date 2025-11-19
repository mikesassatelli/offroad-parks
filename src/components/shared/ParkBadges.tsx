import { Badge } from "@/components/ui/badge";
import type { Amenity, Camping, Terrain } from "@/lib/types";
import { formatCamping } from "@/lib/formatting";

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

interface CampingBadgesProps {
  camping: Camping[];
}

export function CampingBadges({ camping }: CampingBadgesProps) {
  return (
    <div className="flex flex-wrap gap-1">
      {camping.map((c) => (
        <Badge key={c} variant="default">
          {formatCamping(c)}
        </Badge>
      ))}
    </div>
  );
}
