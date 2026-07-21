import Link from "next/link";
import { MapPinned } from "lucide-react";
import { AppHeader } from "@/components/layout/AppHeader";
import { BrokenTruck } from "@/components/BrokenTruck";
import { Button } from "@/components/ui/button";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found · Offroad Parks",
  description: "This trail's a dead end — the page you're looking for took a wrong turn off the map.",
};

export default function NotFound() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <AppHeader />
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-md text-center flex flex-col items-center">
          <BrokenTruck className="w-64 sm:w-80 mb-8" />

          <p className="text-sm font-bold uppercase tracking-widest text-primary">
            404 — Off the map
          </p>
          <h1 className="mt-3 text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground">
            Well, this trail&apos;s a dead end.
          </h1>
          <p className="mt-4 text-base text-muted-foreground leading-7">
            The page you&apos;re looking for took a wrong turn off the map. Let&apos;s
            get you back on solid ground.
          </p>

          <div className="mt-8 flex justify-center">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <Link href="/">
                <MapPinned className="w-4 h-4" />
                Browse parks
              </Link>
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
