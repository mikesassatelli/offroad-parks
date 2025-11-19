import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Park } from "@/lib/types";
import { formatCamping } from "@/lib/formatting";
import { formatPhone } from "@/lib/formatting";
import { Tent, Phone, ExternalLink } from "lucide-react";

interface CampingInfoCardProps {
  park: Park;
}

export function CampingInfoCard({ park }: CampingInfoCardProps) {
  // Don't render if no camping options
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
          <h3 className="text-sm font-semibold text-gray-600 mb-2">
            Available Options
          </h3>
          <div className="flex flex-wrap gap-2">
            {park.camping.map((camping) => (
              <span
                key={camping}
                className="inline-flex items-center px-3 py-1 rounded-full text-sm bg-green-100 text-green-800"
              >
                {formatCamping(camping)}
              </span>
            ))}
          </div>
        </div>

        {/* Camping-Specific Contacts */}
        {hasCampingContacts && (
          <div className="pt-4 border-t border-gray-200">
            <h3 className="text-sm font-semibold text-gray-600 mb-2">
              Reservations
            </h3>
            <div className="space-y-2">
              {park.campingWebsite && (
                <a
                  href={park.campingWebsite}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:underline"
                >
                  <ExternalLink className="w-4 h-4" />
                  Reservations Website
                </a>
              )}
              {park.campingPhone && (
                <div className="flex items-center gap-2 text-gray-700">
                  <Phone className="w-4 h-4" />
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
