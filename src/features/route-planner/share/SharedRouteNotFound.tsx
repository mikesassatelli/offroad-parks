import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPinOff } from "lucide-react";

export function SharedRouteNotFound() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-6">
      <Card className="max-w-md w-full">
        <CardContent className="py-12 text-center">
          <MapPinOff className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <h1 className="text-xl font-semibold text-foreground mb-1">
            Route not found
          </h1>
          <p className="text-sm text-muted-foreground mb-5">
            This route is no longer shared, or the link is invalid.
          </p>
          <Button asChild variant="default" size="sm">
            <Link href="/">Browse parks</Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
