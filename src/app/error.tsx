"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Home, RotateCw } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BrokenTruck } from "@/components/BrokenTruck";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Sentry auto-captures via the app's instrumentation; log for local dev too.
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md text-center flex flex-col items-center">
          <BrokenTruck className="w-64 sm:w-80 mb-8" />

          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            Something broke down
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Something went sideways.
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-7">
            We hit a rough patch loading this page. Give it another crank, or
            head back to base camp.
          </p>

          {error.digest && (
            <p className="mt-3 text-xs text-muted-foreground/70 font-mono">
              Ref: {error.digest}
            </p>
          )}

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto">
            <Button
              size="lg"
              onClick={() => reset()}
              className="w-full sm:w-auto"
            >
              <RotateCw className="w-4 h-4" />
              Try again
            </Button>
            <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
              <Link href="/">
                <Home className="w-4 h-4" />
                Go home
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
