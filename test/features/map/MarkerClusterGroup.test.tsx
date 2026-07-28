import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { MapContainer, Marker } from "react-leaflet";
import L from "leaflet";
import "leaflet.markercluster";
import { MarkerClusterGroup } from "@/features/map/components/MarkerClusterGroup";

// jsdom lacks ResizeObserver, which react-leaflet's MapContainer observes.
if (!("ResizeObserver" in globalThis)) {
  (globalThis as unknown as { ResizeObserver: unknown }).ResizeObserver =
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
}

afterEach(cleanup);

/**
 * Integration test with real leaflet + react-leaflet (no mocks) to prove the
 * core binding: child `<Marker>` elements must attach to the cluster group via
 * the react-leaflet `layerContainer` context, not directly to the map.
 */
describe("MarkerClusterGroup", () => {
  it("attaches child markers to the cluster group, not the map", () => {
    let map: L.Map | null = null;

    render(
      <MapContainer
        center={[35, -94]}
        zoom={5}
        // In the app maxZoom comes from the OSM TileLayer; set it here since
        // this bare test has no tile layer and markercluster requires it.
        maxZoom={18}
        style={{ height: 400, width: 400 }}
        ref={(m) => {
          map = m;
        }}
      >
        <MarkerClusterGroup showCoverageOnHover={false}>
          <Marker position={[35, -94]} />
          <Marker position={[35.05, -94.05]} />
          <Marker position={[35.1, -94.1]} />
        </MarkerClusterGroup>
      </MapContainer>,
    );

    expect(map).not.toBeNull();

    let clusterGroup: L.MarkerClusterGroup | undefined;
    map!.eachLayer((layer) => {
      if (layer instanceof L.MarkerClusterGroup) {
        clusterGroup = layer;
      }
    });

    // The cluster group is on the map, and all three markers live inside it.
    expect(clusterGroup).toBeDefined();
    expect(clusterGroup!.getLayers()).toHaveLength(3);
  });
});
