import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Park } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";
import { ExternalLink } from "lucide-react";

interface ParkDetailsDialogProps {
  park: Park | null;
  isOpen: boolean;
  onClose: () => void;
}

export function ParkDetailsDialog({
  park,
  isOpen,
  onClose,
}: ParkDetailsDialogProps) {
  if (!park) {
    return null;
  }

  const locationDisplay = park.address.city
    ? `${park.address.city}, ${park.address.state}`
    : park.address.state;
  const trailMilesDisplay = park.milesOfTrails ?? "—";
  const formattedDayPass = formatCurrency(park.dayPassUSD);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>{park.name}</DialogTitle>
          <DialogDescription>
            {locationDisplay} · {trailMilesDisplay} mi trails ·{" "}
            {formattedDayPass} day pass
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm">
          {park.notes && <p className="text-gray-700">{park.notes}</p>}
          {park.website && (
            <p>
              <a
                href={park.website}
                target="_blank"
                rel="noreferrer"
                className="underline"
              >
                Official site
              </a>
            </p>
          )}
          {park.phone && <p>Phone: {park.phone}</p>}
          <div className="flex flex-wrap gap-1">
            {park.terrain.map((terrain) => (
              <Badge key={terrain} variant="outline" className="capitalize">
                {terrain}
              </Badge>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {park.amenities.map((amenity) => (
              <Badge key={amenity} className="capitalize" variant="secondary">
                {amenity}
              </Badge>
            ))}
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Always verify hours, passes, and vehicle regulations before
            visiting.
          </div>
          <Link href={`/parks/${park.id}`}>
            <Button variant="outline" size="sm">
              <ExternalLink className="w-4 h-4 mr-2" />
              Full Details
            </Button>
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
}
