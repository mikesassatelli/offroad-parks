import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Park } from "@/lib/types";
import { formatCurrency, formatParkPricingSummary, formatRecommendedDuration } from "@/lib/formatting";
import { Clock, DollarSign, Gauge, Mountain } from "lucide-react";

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
        {park.notes && <p className="text-foreground/80">{park.notes}</p>}

        <div className={`grid gap-4 ${park.averageRecommendedStay ? "grid-cols-2 sm:grid-cols-4" : "grid-cols-3"}`}>
          <div className="flex items-start gap-3">
            <Mountain className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm text-muted-foreground">Trail Miles</div>
              <div className="font-semibold">{park.milesOfTrails ?? "—"}</div>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <DollarSign className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm text-muted-foreground">Pricing</div>
              <div className="font-semibold">
                {formatParkPricingSummary(park)}
              </div>
              {!park.isFree && (
                <div className="text-xs text-muted-foreground mt-0.5 space-y-0.5">
                  {typeof park.dayPassUSD === "number" && (
                    <div>Day pass: {formatCurrency(park.dayPassUSD)}</div>
                  )}
                  {typeof park.vehicleEntryFeeUSD === "number" && (
                    <div>Vehicle entry: {formatCurrency(park.vehicleEntryFeeUSD)}</div>
                  )}
                  {typeof park.riderFeeUSD === "number" && (
                    <div>Per rider: {formatCurrency(park.riderFeeUSD)}</div>
                  )}
                  {typeof park.membershipFeeUSD === "number" && (
                    <div>Membership: {formatCurrency(park.membershipFeeUSD)}</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <Gauge className="w-5 h-5 text-muted-foreground mt-0.5" />
            <div>
              <div className="text-sm text-muted-foreground">Acres</div>
              <div className="font-semibold">{park.acres ?? "—"}</div>
            </div>
          </div>

          {park.averageRecommendedStay && (
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-muted-foreground mt-0.5" />
              <div>
                <div className="text-sm text-muted-foreground">Typical Stay</div>
                <div className="font-semibold">
                  {formatRecommendedDuration(park.averageRecommendedStay)}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
