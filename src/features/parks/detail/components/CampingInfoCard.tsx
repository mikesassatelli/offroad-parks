import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Park } from "@/lib/types";
import type { Camping } from "@/lib/types";
import { formatCamping } from "@/lib/formatting";
import { formatPhone } from "@/lib/formatting";
import {
  ExternalLink,
  Home,
  Phone,
  Tent,
  TreePine,
  Truck,
  Users,
} from "lucide-react";

const CAMPING_ICONS: Record<Camping, React.ComponentType<{ className?: string }>> = {
  tent: Tent,
  rv30A: Truck,
  rv50A: Truck,
  fullHookup: Truck,
  cabin: Home,
  groupSite: Users,
  backcountry: TreePine,
};

interface CampingInfoCardProps {
  park: Park;
}

export function CampingInfoCard({ park }: CampingInfoCardProps) {
  if (!park.camping || park.camping.length === 0) {
    return null;
  }

  const hasCampingContacts = park.campingWebsite || park.campingPhone;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Tent className="h-5 w-5" />
          Camping
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Camping Types */}
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground mb-2">
            Available Options
          </h3>
          <div className="flex flex-wrap gap-2">
            {park.camping.map((camping) => {
              const Icon = CAMPING_ICONS[camping];
              return (
                <span
                  key={camping}
                  className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-sm bg-secondary text-secondary-foreground"
                >
                  <Icon className="w-3.5 h-3.5 shrink-0" />
                  {formatCamping(camping)}
                </span>
              );
            })}
          </div>
        </div>

        {/* Camping-Specific Contacts */}
        {hasCampingContacts && (
          <div className="pt-4 border-t border-border">
            <h3 className="text-sm font-semibold text-muted-foreground mb-2">
              Reservations
            </h3>
            <div className="space-y-2">
              {park.campingWebsite && (
                <a
                  href={park.campingWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-primary hover:underline"
                >
                  <ExternalLink className="w-4 h-4 shrink-0" />
                  Reservations Website
                </a>
              )}
              {park.campingPhone && (
                <div className="flex items-center gap-2 text-foreground/80">
                  <Phone className="w-4 h-4 shrink-0" />
                  <a href={`tel:${park.campingPhone}`} className="hover:underline">
                    {formatPhone(park.campingPhone)}
                  </a>
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
