import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRating, DifficultyRating } from "@/components/reviews";
import { formatCurrency } from "@/lib/formatting";
import type { Park } from "@/lib/types";
import { Camera, MapPin, Star, StarOff } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

interface ParkCardProps {
  park: Park;
  isFavorite: boolean;
  onToggleFavorite: (parkId: string) => void;
}

export function ParkCard({
  park,
  isFavorite,
  onToggleFavorite,
}: ParkCardProps) {
  const handleFavoriteClick = (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    onToggleFavorite(park.id);
  };

  const locationDisplay = park.city
    ? `${park.city}, ${park.state}`
    : park.state;
  const formattedDayPass = formatCurrency(park.dayPassUSD);
  const trailMilesDisplay = park.milesOfTrails ?? "—";
  const acresDisplay = park.acres ?? "—";

  return (
    <Link href={`/parks/${park.id}`} className="block h-full">
      <Card className="rounded-2xl border-2 border-border/50 shadow-sm hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full flex flex-col overflow-hidden bg-gradient-to-br from-card to-card/80">
        {/* Hero Image */}
        {park.heroImage ? (
          <div className="relative h-48 w-full overflow-hidden bg-muted">
            <Image
              src={park.heroImage}
              alt={park.name}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
            />
            <div className="absolute top-2 right-2 z-10">
              <Button
                size="icon"
                variant={isFavorite ? "default" : "secondary"}
                onClick={handleFavoriteClick}
                className="flex-shrink-0 shadow-lg"
              >
                {isFavorite ? (
                  <Star className="w-4 h-4 fill-current" />
                ) : (
                  <StarOff className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        ) : (
          <div className="relative h-48 w-full bg-gradient-to-br from-muted to-muted/50 flex items-center justify-center">
            <Camera className="w-16 h-16 text-muted-foreground/30" />
            <div className="absolute top-2 right-2 z-10">
              <Button
                size="icon"
                variant={isFavorite ? "default" : "secondary"}
                onClick={handleFavoriteClick}
                className="flex-shrink-0"
              >
                {isFavorite ? (
                  <Star className="w-4 h-4 fill-current" />
                ) : (
                  <StarOff className="w-4 h-4" />
                )}
              </Button>
            </div>
          </div>
        )}

        <CardHeader className="pb-3">
          <CardTitle className="leading-tight text-lg text-card-foreground">
            {park.name}
          </CardTitle>
          <div className="flex items-center justify-between mt-1">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <MapPin className="w-4 h-4" />
              <span>{locationDisplay}</span>
            </div>
            {park.averageRating && (
              <StarRating rating={park.averageRating} size="sm" />
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-3 flex-1 flex flex-col">
          <div className="flex flex-wrap gap-1.5">
            {park.terrain.map((terrain) => (
              <Badge key={terrain} variant="outline" className="capitalize">
                {terrain}
              </Badge>
            ))}
          </div>
          <div className="text-sm text-card-foreground/80 grid grid-cols-2 gap-y-1.5">
            <div>
              <span className="text-muted-foreground">Trail miles:</span>{" "}
              <span className="font-medium">{trailMilesDisplay}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Day pass:</span>{" "}
              <span className="font-medium">{formattedDayPass}</span>
            </div>
            <div>
              <span className="text-muted-foreground">Acres:</span>{" "}
              <span className="font-medium">{acresDisplay}</span>
            </div>
            {park.averageDifficulty && (
              <div className="flex items-center gap-1">
                <span className="text-muted-foreground">Difficulty:</span>{" "}
                <DifficultyRating rating={Math.round(park.averageDifficulty)} size="sm" />
              </div>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5 mt-auto">
            {park.amenities.map((amenity) => (
              <Badge key={amenity} className="capitalize" variant="secondary">
                {amenity}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
