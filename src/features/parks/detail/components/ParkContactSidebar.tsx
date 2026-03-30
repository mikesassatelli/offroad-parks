import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Park } from "@/lib/types";
import { ExternalLink, Mail, MapPin, Phone } from "lucide-react";
import { formatPhone } from "@/lib/formatting";

interface ParkContactSidebarProps {
  park: Park;
}

function formatAddress(address: Park["address"]): string | null {
  const parts: string[] = [];
  if (address.streetAddress) parts.push(address.streetAddress);
  if (address.streetAddress2) parts.push(address.streetAddress2);
  const cityStateZip = [
    address.city,
    address.state,
    address.zipCode,
  ]
    .filter(Boolean)
    .join(", ");
  if (cityStateZip) parts.push(cityStateZip);
  return parts.length > 0 ? parts.join("\n") : null;
}

export function ParkContactSidebar({ park }: ParkContactSidebarProps) {
  const fullAddress = formatAddress(park.address);
  const hasStreetAddress = park.address.streetAddress || park.address.zipCode;

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
            <ExternalLink className="w-4 h-4 shrink-0" />
            Official Website
          </a>
        )}

        {park.phone && (
          <div className="flex items-center gap-2 text-foreground/80">
            <Phone className="w-4 h-4 shrink-0" />
            <a href={`tel:${park.phone}`} className="hover:underline">
              {formatPhone(park.phone)}
            </a>
          </div>
        )}

        {park.contactEmail && (
          <div className="flex items-center gap-2 text-foreground/80">
            <Mail className="w-4 h-4 shrink-0" />
            <a
              href={`mailto:${park.contactEmail}`}
              className="hover:underline truncate"
            >
              {park.contactEmail}
            </a>
          </div>
        )}

        {hasStreetAddress && fullAddress && (
          <div className="flex items-start gap-2 text-foreground/80">
            <MapPin className="w-4 h-4 shrink-0 mt-0.5" />
            <address className="not-italic text-sm whitespace-pre-line">
              {fullAddress}
            </address>
          </div>
        )}

        {park.coords && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${park.coords.lat},${park.coords.lng}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            <MapPin className="w-4 h-4 shrink-0" />
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
