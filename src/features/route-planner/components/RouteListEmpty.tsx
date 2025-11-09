import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function RouteListEmpty() {
  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-lg">Route Planner</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-500">
          Click &ldquo;Add to Route&rdquo; on park markers to build your trip.
        </p>
      </CardContent>
    </Card>
  );
}
