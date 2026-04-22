"use client";

import { SessionProvider } from "next-auth/react";
import { AppHeader } from "@/components/layout/AppHeader";
import { SavedRoutesList } from "./SavedRoutesList";
import type { SavedRoute } from "@/lib/types";

interface SavedRoutesPageClientProps {
  initialRoutes: SavedRoute[];
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  };
}

function SavedRoutesPageInner({ initialRoutes, user }: SavedRoutesPageClientProps) {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20">
        <AppHeader user={user} showBackButton />
      </div>

      <main className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-foreground">My Saved Routes</h1>
          <p className="text-muted-foreground mt-1">
            Open a route to continue editing, or rename and delete routes you no
            longer need.
          </p>
        </div>

        <SavedRoutesList initialRoutes={initialRoutes} />
      </main>
    </div>
  );
}

export function SavedRoutesPageClient(props: SavedRoutesPageClientProps) {
  return (
    <SessionProvider>
      <SavedRoutesPageInner {...props} />
    </SessionProvider>
  );
}
