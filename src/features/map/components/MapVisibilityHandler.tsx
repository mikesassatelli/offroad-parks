import { useEffect } from "react";
import { useMap } from "react-leaflet";
import type { Park } from "@/lib/types";

interface MapVisibilityHandlerProps {
  /**
   * When the map is rendered inside a tab / accordion / dialog that becomes
   * visible after mount, Leaflet's initial container-size measurement can be
   * stale. Pass the single park whose coordinates should land visually
   * centered once the container is stable.
   *
   * If `center` is omitted this component only invokes `invalidateSize()`
   * without re-centering.
   */
  center?: Park;
  /** Zoom used when recentering on the provided park. */
  zoom?: number;
}

/**
 * Fixes the "map centered too far north on initial tab activation" bug.
 *
 * When a Leaflet `MapContainer` is rendered inside a container whose size is
 * not yet stable (e.g. a Radix Tabs panel that was just shown), Leaflet
 * caches the wrong viewport dimensions. The result is that `setView` /
 * `fitBounds` run against a smaller-than-actual viewport and the target
 * coordinate ends up pushed off-center once the panel reaches its final
 * height.
 *
 * This component watches the map's container with a `ResizeObserver` and,
 * whenever its dimensions change, calls `invalidateSize()` followed by a
 * fresh `setView` on the provided `center`. The effect is idempotent — once
 * the container stabilises, subsequent observer callbacks remain no-ops from
 * the user's perspective.
 */
export function MapVisibilityHandler({
  center,
  zoom = 8,
}: MapVisibilityHandlerProps) {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    if (!container) return;

    const recenter = () => {
      map.invalidateSize();
      if (center?.coords) {
        map.setView([center.coords.lat, center.coords.lng], zoom, {
          animate: false,
        });
      }
    };

    // Run once immediately in case the container is already sized by the
    // time this effect mounts (common in the happy path).
    recenter();

    // ResizeObserver handles the case where the container gains height
    // after the tab pane transitions in.
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      recenter();
    });
    observer.observe(container);

    return () => {
      observer.disconnect();
    };
    // `map` instance is stable for the lifetime of MapContainer; re-run when
    // the target park or zoom changes. We intentionally depend on the
    // primitive lat/lng values rather than the `center` object reference.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, center?.coords?.lat, center?.coords?.lng, zoom]);

  return null;
}
