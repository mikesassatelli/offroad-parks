import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { Park } from "@/lib/types";
import { formatOwnership } from "@/lib/formatting";
import {
  Building2,
  Calendar,
  ChevronsLeftRight,
  CreditCard,
  FileWarning,
  Flag,
  Flame,
  HardHat,
  Info,
  Volume2,
} from "lucide-react";

interface ParkOperationalCardProps {
  park: Park;
}

interface RowProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: React.ReactNode;
}

function Row({ icon: Icon, label, value }: RowProps) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <span className="text-sm text-muted-foreground">{label}</span>
        <div className="text-sm font-medium mt-0.5">{value}</div>
      </div>
    </div>
  );
}

export function ParkOperationalCard({ park }: ParkOperationalCardProps) {
  const hasAny =
    park.datesOpen ||
    park.ownership ||
    park.permitRequired ||
    park.membershipRequired ||
    park.maxVehicleWidthInches ||
    park.flagsRequired ||
    park.sparkArrestorRequired ||
    park.helmetsRequired ||
    park.noiseLimitDBA;

  if (!hasAny) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="w-5 h-5" />
          Park Details
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {park.datesOpen && (
          <Row
            icon={Calendar}
            label="Open"
            value={park.datesOpen}
          />
        )}

        {park.ownership && (
          <Row
            icon={Building2}
            label="Ownership"
            value={formatOwnership(park.ownership)}
          />
        )}

        {park.maxVehicleWidthInches && (
          <Row
            icon={ChevronsLeftRight}
            label="Max Vehicle Width"
            value={`${park.maxVehicleWidthInches}″`}
          />
        )}

        {park.noiseLimitDBA && (
          <Row
            icon={Volume2}
            label="Noise Limit"
            value={`${park.noiseLimitDBA} dBA`}
          />
        )}

        {(park.permitRequired ||
          park.membershipRequired ||
          park.flagsRequired ||
          park.sparkArrestorRequired ||
          park.helmetsRequired) && (
          <div className="pt-1">
            <p className="text-sm text-muted-foreground mb-2">Requirements</p>
            <div className="flex flex-wrap gap-2">
              {park.permitRequired && (
                <Badge variant="destructive" className="gap-1.5">
                  <FileWarning className="w-3 h-3" />
                  {park.permitType ? `Permit: ${park.permitType}` : "Permit Required"}
                </Badge>
              )}
              {park.membershipRequired && (
                <Badge variant="destructive" className="gap-1.5">
                  <CreditCard className="w-3 h-3" />
                  Membership Required
                </Badge>
              )}
              {park.flagsRequired && (
                <Badge variant="destructive" className="gap-1.5">
                  <Flag className="w-3 h-3" />
                  Flag Required
                </Badge>
              )}
              {park.sparkArrestorRequired && (
                <Badge variant="destructive" className="gap-1.5">
                  <Flame className="w-3 h-3" />
                  Spark Arrestor Required
                </Badge>
              )}
              {park.helmetsRequired && (
                <Badge variant="destructive" className="gap-1.5">
                  <HardHat className="w-3 h-3" />
                  Helmets Required
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
