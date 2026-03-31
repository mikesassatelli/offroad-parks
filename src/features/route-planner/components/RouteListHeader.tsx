import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Trash2 } from "lucide-react";

interface RouteListHeaderProps {
  onClearRoute: () => void;
  totalDistanceMi?: number;
  estimatedDurationMin?: number;
  isRouting?: boolean;
  /** @deprecated Use totalDistanceMi instead */
  totalDistance?: number;
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export function RouteListHeader({
  onClearRoute,
  totalDistanceMi,
  estimatedDurationMin,
  isRouting,
  totalDistance,
}: RouteListHeaderProps) {
  // Prefer new prop, fall back to legacy
  const distanceMi = totalDistanceMi ?? totalDistance;

  return (
    <CardHeader className="pb-3">
      <div className="flex items-center justify-between">
        <CardTitle className="text-lg">Route Planner</CardTitle>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearRoute}
          className="h-8"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          Clear
        </Button>
      </div>

      {isRouting && (
        <p className="text-sm text-muted-foreground flex items-center gap-1">
          <Loader2 className="w-3 h-3 animate-spin" />
          Calculating route…
        </p>
      )}

      {!isRouting && distanceMi != null && distanceMi > 0 && (
        <p className="text-sm text-muted-foreground">
          Total distance:{" "}
          <span className="font-semibold">{distanceMi} mi</span>
          {estimatedDurationMin != null && estimatedDurationMin > 0 && (
            <> · ~<span className="font-semibold">{formatDuration(estimatedDurationMin)}</span> drive</>
          )}
          {totalDistanceMi == null && !estimatedDurationMin && (
            <span className="text-xs ml-1">(as the crow flies)</span>
          )}
        </p>
      )}
    </CardHeader>
  );
}
