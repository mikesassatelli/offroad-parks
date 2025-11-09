import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Park } from "@/lib/types";
import { ExternalLink, Phone, MapPin } from "lucide-react";

interface ParkContactSidebarProps {
  park: Park;
}

export function ParkContactSidebar({ park }: ParkContactSidebarProps) {
  return (
    <Card className="sticky top-4">
      <CardHeader>
        <CardTitle>Contact & Links</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {park.website && (
          <a
            href={park.website}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:underline"
          >
            <ExternalLink className="w-4 h-4" />
            Official Website
          </a>
        )}

        {park.phone && (
          <div className="flex items-center gap-2 text-gray-700">
            <Phone className="w-4 h-4" />
            <a href={`tel:${park.phone}`} className="hover:underline">
              {park.phone}
            </a>
          </div>
        )}

        {park.coords && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${park.coords.lat},${park.coords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-blue-600 hover:underline"
          >
            <MapPin className="w-4 h-4" />
            Get Directions
          </a>
        )}

        <div className="pt-4 border-t text-xs text-gray-500">
          Always verify hours, passes, and vehicle regulations before visiting.
        </div>
      </CardContent>
    </Card>
  );
}
