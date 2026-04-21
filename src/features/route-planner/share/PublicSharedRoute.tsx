"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { SessionProvider, signIn, useSession } from "next-auth/react";
import { AppHeader } from "@/components/layout/AppHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LogIn, Loader2, Save } from "lucide-react";
import type { RouteWaypoint, SavedRoute } from "@/lib/types";

// Reuse the main map view. Dynamic import so leaflet isn't SSR'd.
const MapView = dynamic(
  () => import("@/features/map/MapView").then((mod) => mod.MapView),
  { ssr: false },
);

interface PublicSharedRouteProps {
  route: SavedRoute;
  /** Serialized session user when the visitor is logged in. */
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  } | null;
  shareUrl: string;
}

function formatDuration(minutes: number | null | undefined): string | null {
  if (minutes == null || minutes <= 0) return null;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m} min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m} min`;
}

function PublicSharedRouteInner({
  route,
  user,
  shareUrl,
}: PublicSharedRouteProps) {
  const { data: session } = useSession();
  const isAuthenticated = !!session?.user || !!user;
  const router = useRouter();
  const [isSavingCopy, setIsSavingCopy] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const duration = formatDuration(route.estimatedDurationMin);
  const waypoints: RouteWaypoint[] = route.waypoints ?? [];

  const handleSaveCopy = async () => {
    setIsSavingCopy(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/routes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: `Copy of ${route.title}`,
          description: route.description ?? null,
          isPublic: false,
          waypoints,
          routeGeometry: route.routeGeometry ?? null,
          totalDistanceMi: route.totalDistanceMi ?? null,
          estimatedDurationMin: route.estimatedDurationMin ?? null,
        }),
      });
      if (!res.ok) {
        setSaveError("Unable to save a copy. Please try again.");
        return;
      }
      router.push("/routes");
    } catch {
      setSaveError("Unable to save a copy. Please try again.");
    } finally {
      setIsSavingCopy(false);
    }
  };

  const handleSignIn = () => {
    // Send user back here after signin
    signIn(undefined, { callbackUrl: shareUrl });
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20">
        <AppHeader user={user} />
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Shared route
            </p>
            <h1
              className="text-3xl font-bold text-foreground mt-1 break-words"
              title={route.title}
            >
              {route.title}
            </h1>
            {route.description && (
              <p className="text-muted-foreground mt-2 whitespace-pre-wrap">
                {route.description}
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span>{waypoints.length} stops</span>
              {route.totalDistanceMi != null && route.totalDistanceMi > 0 && (
                <span>{route.totalDistanceMi} mi</span>
              )}
              {duration && <span>{duration}</span>}
            </div>
          </div>

          <div className="shrink-0">
            {isAuthenticated ? (
              <Button
                onClick={handleSaveCopy}
                disabled={isSavingCopy}
                data-testid="save-copy-button"
              >
                {isSavingCopy ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    Saving…
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-1" />
                    Save a copy
                  </>
                )}
              </Button>
            ) : (
              <Button
                onClick={handleSignIn}
                variant="default"
                data-testid="signin-to-save-button"
              >
                <LogIn className="w-4 h-4 mr-1" />
                Sign in to save
              </Button>
            )}
          </div>
        </header>

        {saveError && (
          <p className="text-sm text-destructive" role="alert">
            {saveError}
          </p>
        )}

        {/* Map preview */}
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            <MapView
              parks={[]}
              routeWaypoints={waypoints}
              routeGeometry={route.routeGeometry ?? null}
              containerClassName="h-[420px] w-full"
            />
          </CardContent>
        </Card>

        {/* Waypoint list */}
        <Card>
          <CardContent className="p-4">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-3">
              Stops
            </h2>
            <ol className="space-y-2">
              {waypoints.map((w, i) => (
                <li
                  key={w.id}
                  className="flex items-start gap-3 text-sm"
                >
                  <span className="inline-flex shrink-0 items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-semibold">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium truncate">{w.label}</p>
                    <p className="text-xs text-muted-foreground">
                      {w.type === "park" ? "Park" : "Custom stop"}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

export function PublicSharedRoute(props: PublicSharedRouteProps) {
  return (
    <SessionProvider>
      <PublicSharedRouteInner {...props} />
    </SessionProvider>
  );
}
