"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { SavedRoute } from "@/lib/types";
import { ChevronDown, ChevronUp, Eye, EyeOff, Loader2 } from "lucide-react";

interface MyRoutesOverlayPanelProps {
  /**
   * Called when the user selects a saved route to preview on the map. Passing
   * `null` clears the current preview.
   */
  onSelectRoute: (route: SavedRoute | null) => void;
  /** Currently previewed route id, if any. */
  selectedRouteId: string | null;
}

/**
 * Lightweight saved-routes overlay for the main map tab. Fetches the user's
 * routes lazily on first open and lets them toggle a preview polyline on the
 * map. Pairs with `MapView.savedRoutePreview` — keeps the feature scoped and
 * isolated from the active route builder.
 */
export function MyRoutesOverlayPanel({
  onSelectRoute,
  selectedRouteId,
}: MyRoutesOverlayPanelProps) {
  const [open, setOpen] = useState(false);
  const [routes, setRoutes] = useState<SavedRoute[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Lazy-load routes the first time the panel is expanded. Kept out of an
  // effect so we don't synchronously call setState during render (satisfies
  // the `react-hooks/set-state-in-effect` lint rule).
  const loadRoutes = useCallback(async () => {
    if (routes !== null || loading) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/routes");
      if (!res.ok) throw new Error("Failed to load routes");
      const data = (await res.json()) as SavedRoute[];
      setRoutes(data);
    } catch {
      setError("Failed to load routes");
    } finally {
      setLoading(false);
    }
  }, [routes, loading]);

  const handleToggleOpen = () => {
    setOpen((prev) => {
      const next = !prev;
      if (next) {
        // Fire-and-forget — errors are surfaced via state.
        void loadRoutes();
      }
      return next;
    });
  };

  return (
    <Card className="mb-3">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">My Routes</CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleToggleOpen}
            aria-expanded={open}
            aria-controls="my-routes-overlay-panel"
          >
            {open ? (
              <>
                <ChevronUp className="w-4 h-4 mr-1" /> Hide
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4 mr-1" /> Show
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      {open && (
        <CardContent id="my-routes-overlay-panel" className="pt-0">
          {loading && (
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin" /> Loading…
            </p>
          )}
          {error && <p className="text-xs text-destructive">{error}</p>}
          {!loading && !error && routes && routes.length === 0 && (
            <p className="text-xs text-muted-foreground">
              You haven&apos;t saved any routes yet.{" "}
              <Link href="/routes" className="underline hover:text-primary">
                Manage routes
              </Link>
            </p>
          )}
          {!loading && routes && routes.length > 0 && (
            <ul
              data-testid="my-routes-overlay-list"
              className="space-y-1 max-h-64 overflow-y-auto"
            >
              {routes.map((route) => {
                const isActive = selectedRouteId === route.id;
                return (
                  <li key={route.id}>
                    <button
                      type="button"
                      onClick={() =>
                        isActive ? onSelectRoute(null) : onSelectRoute(route)
                      }
                      className={`w-full flex items-center justify-between gap-2 text-left text-sm px-2 py-1.5 rounded hover:bg-accent hover:text-accent-foreground transition ${
                        isActive ? "bg-accent text-accent-foreground" : ""
                      }`}
                    >
                      <span className="truncate flex-1">{route.title}</span>
                      <span className="text-xs text-muted-foreground flex items-center gap-1 flex-shrink-0">
                        {isActive ? (
                          <>
                            <Eye className="w-3 h-3" /> Showing
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" /> Preview
                          </>
                        )}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {routes && routes.length > 0 && (
            <div className="mt-2 pt-2 border-t">
              <Link
                href="/routes"
                className="text-xs text-muted-foreground underline hover:text-primary"
              >
                Manage my routes
              </Link>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
