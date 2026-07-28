"use client";

import { createLayerComponent } from "@react-leaflet/core";
import L from "leaflet";
import "leaflet.markercluster";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";
import type { ReactNode } from "react";

export interface MarkerClusterGroupProps extends L.MarkerClusterGroupOptions {
  children?: ReactNode;
}

/**
 * A thin react-leaflet binding for `leaflet.markercluster`'s cluster group.
 *
 * Built on `@react-leaflet/core` (the app's installed react-leaflet v5 core)
 * rather than the `react-leaflet-cluster` wrapper, whose published version
 * targets react-leaflet v4 and pulls an incompatible core. The cluster group
 * is a `LayerGroup`, so it can provide itself as the `layerContainer` in the
 * react-leaflet context — child `<Marker>`/`<Popup>` elements then attach to
 * the cluster group instead of the map, keeping their interactive React popups
 * intact.
 */
export const MarkerClusterGroup = createLayerComponent<
  L.MarkerClusterGroup,
  MarkerClusterGroupProps
>(function createClusterGroup(props, context) {
  // `children` is consumed by react-leaflet, not the cluster group; strip it
  // from the options passed to leaflet.markercluster.
  const options: L.MarkerClusterGroupOptions = { ...props };
  delete (options as { children?: unknown }).children;

  const instance = L.markerClusterGroup(options);
  return {
    instance,
    // Children read `layerContainer` from context to decide what to add
    // themselves to; point it at the cluster group.
    context: { ...context, layerContainer: instance },
  };
});
