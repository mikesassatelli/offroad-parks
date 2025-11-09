import { Button } from "@/components/ui/button";
import { CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

interface RouteListHeaderProps {
  totalDistance: number;
  onClearRoute: () => void;
}

export function RouteListHeader({
  totalDistance,
  onClearRoute,
}: RouteListHeaderProps) {
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
      {totalDistance > 0 && (
        <p className="text-sm text-gray-600">
          Total distance:{" "}
          <span className="font-semibold">{totalDistance} mi</span> (as the crow
          flies)
        </p>
      )}
    </CardHeader>
  );
}
