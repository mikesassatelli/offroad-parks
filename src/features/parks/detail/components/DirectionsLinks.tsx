"use client";

import { useSyncExternalStore } from "react";
import { MapPin } from "lucide-react";
import {
  appleMapsDestinationUrl,
  googleMapsDestinationUrl,
  isAppleDevice,
} from "@/features/map/utils/export";

interface DirectionsLinksProps {
  lat: number;
  lng: number;
}

const noopSubscribe = () => () => {};

/**
 * Read whether the viewer is on an Apple device without a hydration mismatch:
 * the server snapshot is always `false` (Google-first), and React swaps to the
 * real client value after hydration.
 */
function useIsAppleDevice(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => isAppleDevice(),
    () => false,
  );
}

/**
 * Platform-aware "Get Directions" links for a single park. Leads with the
 * viewer's native maps app (Apple Maps on iOS/macOS, otherwise Google Maps)
 * and offers the other as a secondary option. Both are plain deep links —
 * no API key, no metered calls.
 *
 * Rendered client-side because the preferred app depends on `navigator`; it
 * defaults to Google Maps first during SSR/hydration and swaps to Apple on
 * Apple devices once mounted.
 */
export function DirectionsLinks({ lat, lng }: DirectionsLinksProps) {
  const apple = useIsAppleDevice();

  const googleUrl = googleMapsDestinationUrl({ lat, lng });
  const appleUrl = appleMapsDestinationUrl({ lat, lng });

  const primary = apple
    ? { href: appleUrl, label: "Get Directions (Apple Maps)" }
    : { href: googleUrl, label: "Get Directions (Google Maps)" };
  const secondary = apple
    ? { href: googleUrl, label: "Open in Google Maps" }
    : { href: appleUrl, label: "Open in Apple Maps" };

  return (
    <div className="space-y-2">
      <a
        href={primary.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-primary hover:underline"
      >
        <MapPin className="w-4 h-4 shrink-0" />
        {primary.label}
      </a>
      <a
        href={secondary.href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 text-sm text-muted-foreground hover:underline"
      >
        {secondary.label}
      </a>
    </div>
  );
}
