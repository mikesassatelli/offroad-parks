import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Park } from "@/lib/types";

interface ParkAttributesCardsProps {
  park: Park;
}

export function ParkAttributesCards({ park }: ParkAttributesCardsProps) {
  return (
    <>
      {/* Terrain Card */}
      <Card>
        <CardHeader>
          <CardTitle>Terrain Types</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {park.terrain.map((terrain) => (
              <Badge
                key={terrain}
                variant="outline"
                className="capitalize text-sm"
              >
                {terrain}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Difficulty Card */}
      <Card>
        <CardHeader>
          <CardTitle>Difficulty Levels</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {park.difficulty.map((level) => (
              <Badge
                key={level}
                variant="secondary"
                className="capitalize text-sm"
              >
                {level}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Amenities Card */}
      <Card>
        <CardHeader>
          <CardTitle>Amenities</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {park.amenities.map((amenity) => (
              <Badge key={amenity} className="capitalize text-sm">
                {amenity}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </>
  );
}
