import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Park } from "@/lib/types";
import { formatCurrency } from "@/lib/formatting";
import { DollarSign, Gauge, Mountain } from "lucide-react";

interface ParkOverviewCardProps {
  park: Park;
}

export function ParkOverviewCard({ park }: ParkOverviewCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Overview</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {park.notes && <p className="text-gray-700">{park.notes}</p>}

        <div className="grid grid-cols-3 gap-4">
          <div className="flex items-start gap-3">
            <Mountain className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500">Trail Miles</div>
              <div className="font-semibold">{park.milesOfTrails ?? "—"}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500">Day Pass</div>
              <div className="font-semibold">
                {formatCurrency(park.dayPassUSD)}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Gauge className="w-5 h-5 text-gray-500 mt-0.5" />
            <div>
              <div className="text-sm text-gray-500">Acres</div>
              <div className="font-semibold">{park.acres ?? "—"}</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
