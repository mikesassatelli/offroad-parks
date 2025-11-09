import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/formatting";
import type { Park } from "@/lib/types";
import { MapPin, Star, StarOff } from "lucide-react";
import Link from "next/link";

interface ParkCardProps {
  park: Park;
  isFavorite: boolean;
  onToggleFavorite: (parkId: string) => void;
  onCardClick: (park: Park) => void;
}

export function ParkCard({
  park,
  isFavorite,
  onToggleFavorite,
  onCardClick,
}: ParkCardProps) {
  const handleFavoriteClick = (event: React.MouseEvent) => {
    event.stopPropagation();
    onToggleFavorite(park.id);
  };

  const handleCardClick = () => {
    // Allow default link behavior, but also trigger the callback for dialog
    onCardClick(park);
  };

  const locationDisplay = park.city
    ? `${park.city}, ${park.state}`
    : park.state;
  const formattedDayPass = formatCurrency(park.dayPassUSD);
  const trailMilesDisplay = park.milesOfTrails ?? "—";
  const acresDisplay = park.acres ?? "—";

  return (
    <Link href={`/parks/${park.id}`} className="block h-full">
      <Card
        className="rounded-2xl border-2 border-border/50 shadow-sm hover:shadow-lg hover:border-primary/30 hover:-translate-y-0.5 transition-all duration-200 cursor-pointer h-full flex flex-col bg-gradient-to-br from-card to-card/80"
        onClick={handleCardClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="leading-tight text-lg text-card-foreground">
              {park.name}
            </CardTitle>
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
          <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
            <MapPin className="w-4 h-4" />
            <span>{locationDisplay}</span>
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
            <div>
              <span className="text-muted-foreground">UTV allowed:</span>{" "}
              <span className="font-medium">
                {park.utvAllowed ? "Yes" : "No"}
              </span>
            </div>
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
