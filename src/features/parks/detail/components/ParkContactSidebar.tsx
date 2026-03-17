import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Park } from "@/lib/types";
import { ExternalLink, MapPin, Phone } from "lucide-react";
import { formatPhone } from "@/lib/formatting";

interface ParkContactSidebarProps {
  park: Park;
}

export function ParkContactSidebar({ park }: ParkContactSidebarProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Contact & Links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {park.website && (
          <a
            href={park.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Official Website
          </a>
        )}

        {park.phone && (
          <div className="flex items-center gap-2 text-foreground/80">
            <Phone className="w-4 h-4" />
            <a href={`tel:${park.phone}`} className="hover:underline">
              {formatPhone(park.phone)}
            </a>
          </div>
        )}

        {park.coords && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${park.coords.lat},${park.coords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <MapPin className="w-4 h-4" />
            Get Directions
          </a>
        )}

        <div className="pt-4 border-t text-xs text-muted-foreground">
          Always verify hours, passes, and vehicle regulations before visiting.
        </div>
      </CardContent>
    </Card>
  );
}
