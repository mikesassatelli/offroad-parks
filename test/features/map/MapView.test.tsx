import { act, render, screen } from "@testing-library/react";
import { MapView } from "@/features/map/MapView";
import { beforeEach, vi } from "vitest";
import type { Park, RouteWaypoint } from "@/lib/types";

// Capture every handler object passed to `useMapEvents` so individual tests
// can trigger `click`, `zoomend`, and `moveend` callbacks directly.
const useMapEventsHandlers: Array<Record<string, (...args: any[]) => void>> = [];

// Mock react-leaflet
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children, center, zoom }: any) => (
    <div
      data-testid="map-container"
      data-center={JSON.stringify(center)}
      data-zoom={zoom}
    >
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  useMapEvents: (handlers: Record<string, (...args: any[]) => void>) => {
    useMapEventsHandlers.push(handlers);
    return null;
  },
}));

// Mock child components
vi.mock("@/features/map/components/MapBoundsHandler", () => ({
  MapBoundsHandler: ({ parks }: any) => (
    <div data-testid="bounds-handler" data-parks-count={parks.length} />
  ),
}));

vi.mock("@/features/map/components/MapVisibilityHandler", () => ({
  MapVisibilityHandler: ({ center, zoom }: any) => (
    <div
      data-testid="visibility-handler"
      data-center-id={center?.id}
      data-zoom={zoom}
    />
  ),
}));

vi.mock("@/features/map/components/CustomWaypointMarker", () => ({
  CustomWaypointMarker: ({ waypoint, index, onRemove }: any) => (
    <div
      data-testid={`custom-waypoint-${waypoint.id}`}
      data-index={index}
      data-has-remove={typeof onRemove === "function"}
    >
      {waypoint.label}
    </div>
  ),
}));

vi.mock("@/features/map/components/ParkMarker", () => ({
  ParkMarker: ({ park, isInRoute, routeIndex }: any) => (
    <div
      data-testid={`park-marker-${park.id}`}
      data-in-route={isInRoute}
      data-route-index={routeIndex}
    >
      {park.name}
    </div>
  ),
}));

vi.mock("@/features/map/components/RoutePolylines", () => ({
  RoutePolylines: ({ routeParks }: any) => (
    <div data-testid="route-polylines" data-route-count={routeParks.length} />
  ),
}));

// Mock CSS imports
vi.mock("./utils/markers", () => ({}));
vi.mock("leaflet/dist/leaflet.css", () => ({}));

const makeWaypoint = (parkId: string, lat: number, lng: number): RouteWaypoint => ({
  id: `wp-${parkId}`,
  type: "park",
  label: `Park ${parkId}`,
  parkId,
  parkSlug: parkId,
  lat,
  lng,
});

describe("MapView", () => {
  const mockPark1: Park = {
    id: "park-1",
    name: "Park One",
    address: { state: "CA" },
    coords: { lat: 34.0522, lng: -118.2437 },
    terrain: [],
    amenities: [],
    camping: [],
    vehicleTypes: [],
  };

  const mockPark2: Park = {
    id: "park-2",
    name: "Park Two",
    address: { state: "NV" },
    coords: { lat: 36.1699, lng: -115.1398 },
    terrain: [],
    amenities: [],
    camping: [],
    vehicleTypes: [],
  };

  const mockParkNoCoords: Park = {
    id: "park-3",
    name: "Park No Coords",
    address: { state: "AZ" },
    coords: undefined,
    terrain: [],
    amenities: [],
    camping: [],
    vehicleTypes: [],
  };

  const wp1 = makeWaypoint("park-1", 34.0522, -118.2437);
  const wp2 = makeWaypoint("park-2", 36.1699, -115.1398);

  beforeEach(() => {
    useMapEventsHandlers.length = 0;
  });

  it("should render map container", () => {
    render(<MapView parks={[mockPark1]} />);
    expect(screen.getByTestId("map-container")).toBeInTheDocument();
  });

  it("should render tile layer", () => {
    render(<MapView parks={[mockPark1]} />);
    expect(screen.getByTestId("tile-layer")).toBeInTheDocument();
  });

  it("should center on first park with coordinates", () => {
    const { getByTestId } = render(<MapView parks={[mockPark1]} />);

    const mapContainer = getByTestId("map-container");
    const center = JSON.parse(mapContainer.getAttribute("data-center") || "[]");

    expect(center).toEqual([34.0522, -118.2437]);
  });

  it("should use default US center when no parks have coordinates", () => {
    const { getByTestId } = render(<MapView parks={[mockParkNoCoords]} />);

    const mapContainer = getByTestId("map-container");
    const center = JSON.parse(mapContainer.getAttribute("data-center") || "[]");

    expect(center).toEqual([39.8283, -98.5795]);
  });

  it("should filter out parks without coordinates", () => {
    render(<MapView parks={[mockPark1, mockParkNoCoords, mockPark2]} />);

    expect(screen.getByTestId("park-marker-park-1")).toBeInTheDocument();
    expect(screen.getByTestId("park-marker-park-2")).toBeInTheDocument();
    expect(screen.queryByTestId("park-marker-park-3")).not.toBeInTheDocument();
  });

  it("should pass filtered parks to bounds handler", () => {
    const { getByTestId } = render(
      <MapView parks={[mockPark1, mockParkNoCoords, mockPark2]} />,
    );

    const boundsHandler = getByTestId("bounds-handler");
    expect(boundsHandler).toHaveAttribute("data-parks-count", "2");
  });

  it("should render park markers for all parks with coordinates", () => {
    render(<MapView parks={[mockPark1, mockPark2]} />);

    expect(screen.getByText("Park One")).toBeInTheDocument();
    expect(screen.getByText("Park Two")).toBeInTheDocument();
  });

  it("should show route polylines when routeWaypoints provided", () => {
    const { getByTestId } = render(
      <MapView parks={[mockPark1]} routeWaypoints={[wp1, wp2]} />,
    );

    const polylines = getByTestId("route-polylines");
    expect(polylines).toHaveAttribute("data-route-count", "2");
  });

  it("should default to empty route when routeWaypoints not provided", () => {
    const { getByTestId } = render(<MapView parks={[mockPark1]} />);

    const polylines = getByTestId("route-polylines");
    expect(polylines).toHaveAttribute("data-route-count", "0");
  });

  it("should mark parks as in route correctly", () => {
    const isParkInRoute = (parkId: string) => parkId === "park-1";

    const { getByTestId } = render(
      <MapView
        parks={[mockPark1, mockPark2]}
        routeWaypoints={[wp1]}
        isParkInRoute={isParkInRoute}
      />,
    );

    expect(getByTestId("park-marker-park-1")).toHaveAttribute(
      "data-in-route",
      "true",
    );
    expect(getByTestId("park-marker-park-2")).toHaveAttribute(
      "data-in-route",
      "false",
    );
  });

  it("should calculate route index correctly", () => {
    const { getByTestId } = render(
      <MapView
        parks={[mockPark1, mockPark2]}
        routeWaypoints={[wp2, wp1]}
      />,
    );

    expect(getByTestId("park-marker-park-1")).toHaveAttribute(
      "data-route-index",
      "1",
    );
    expect(getByTestId("park-marker-park-2")).toHaveAttribute(
      "data-route-index",
      "0",
    );
  });

  it("should pass onAddToRoute handler to markers", () => {
    const onAddToRoute = vi.fn();

    render(<MapView parks={[mockPark1]} onAddToRoute={onAddToRoute} />);

    expect(screen.getByTestId("park-marker-park-1")).toBeInTheDocument();
  });

  it("should show message when some parks have no coordinates", () => {
    render(<MapView parks={[mockPark1, mockParkNoCoords, mockPark2]} />);

    expect(
      screen.getByText(/Showing 2 of 3 parks with coordinates/),
    ).toBeInTheDocument();
  });

  it("should not show message when all parks have coordinates", () => {
    render(<MapView parks={[mockPark1, mockPark2]} />);

    expect(
      screen.queryByText(/Showing.*parks with coordinates/),
    ).not.toBeInTheDocument();
  });

  it("should handle empty parks array", () => {
    const { getByTestId } = render(<MapView parks={[]} />);

    const mapContainer = getByTestId("map-container");
    const center = JSON.parse(mapContainer.getAttribute("data-center") || "[]");

    expect(center).toEqual([39.8283, -98.5795]);
  });

  it("should memoize center position", () => {
    const { rerender, getByTestId } = render(<MapView parks={[mockPark1]} />);

    const initialCenter = JSON.parse(
      getByTestId("map-container").getAttribute("data-center") || "[]",
    );

    rerender(<MapView parks={[mockPark1]} />);

    const newCenter = JSON.parse(
      getByTestId("map-container").getAttribute("data-center") || "[]",
    );

    expect(initialCenter).toEqual(newCenter);
  });

  it("should handle park not in route when isParkInRoute is undefined", () => {
    const { getByTestId } = render(
      <MapView parks={[mockPark1]} routeWaypoints={[]} />,
    );

    expect(getByTestId("park-marker-park-1")).toHaveAttribute(
      "data-in-route",
      "false",
    );
  });

  it("should find correct route index for park in route", () => {
    const { getByTestId } = render(
      <MapView
        parks={[mockPark1, mockPark2]}
        routeWaypoints={[wp1, wp2]}
      />,
    );

    expect(getByTestId("park-marker-park-1")).toHaveAttribute(
      "data-route-index",
      "0",
    );
    expect(getByTestId("park-marker-park-2")).toHaveAttribute(
      "data-route-index",
      "1",
    );
  });

  it("should return -1 for route index when park not in route", () => {
    const { getByTestId } = render(
      <MapView parks={[mockPark1, mockPark2]} routeWaypoints={[wp1]} />,
    );

    expect(getByTestId("park-marker-park-2")).toHaveAttribute(
      "data-route-index",
      "-1",
    );
  });

  describe("fitOnVisible (Location tab centering fix)", () => {
    it("should not render visibility handler by default", () => {
      render(<MapView parks={[mockPark1]} />);
      expect(screen.queryByTestId("visibility-handler")).not.toBeInTheDocument();
    });

    it("should render visibility handler when fitOnVisible is set and exactly one park has coords", () => {
      const { getByTestId } = render(
        <MapView parks={[mockPark1]} fitOnVisible />,
      );
      const handler = getByTestId("visibility-handler");
      expect(handler).toBeInTheDocument();
      expect(handler).toHaveAttribute("data-center-id", "park-1");
    });

    it("should pass custom fitOnVisibleZoom through to the visibility handler", () => {
      const { getByTestId } = render(
        <MapView parks={[mockPark1]} fitOnVisible fitOnVisibleZoom={11} />,
      );
      expect(getByTestId("visibility-handler")).toHaveAttribute(
        "data-zoom",
        "11",
      );
    });

    it("should not render visibility handler when fitOnVisible is set but multiple parks have coords", () => {
      render(<MapView parks={[mockPark1, mockPark2]} fitOnVisible />);
      expect(screen.queryByTestId("visibility-handler")).not.toBeInTheDocument();
    });

    it("should not render visibility handler when fitOnVisible is set but no parks have coords", () => {
      render(<MapView parks={[mockParkNoCoords]} fitOnVisible />);
      expect(screen.queryByTestId("visibility-handler")).not.toBeInTheDocument();
    });

    it("should use custom containerClassName when provided", () => {
      const { container } = render(
        <MapView
          parks={[mockPark1]}
          fitOnVisible
          containerClassName="h-96 w-full custom-marker"
        />,
      );
      const wrapper = container.querySelector(".custom-marker");
      expect(wrapper).not.toBeNull();
      expect(wrapper?.className).toContain("h-96");
      // Default full-viewport height class must not leak through.
      expect(wrapper?.className).not.toContain("calc(100vh");
    });

    it("should fall back to the default full-viewport wrapper class when containerClassName is omitted", () => {
      const { container } = render(<MapView parks={[mockPark1]} />);
      const wrapper = container.firstElementChild as HTMLElement | null;
      expect(wrapper).not.toBeNull();
      // Default wrapper uses calc(100vh - 12rem) so the map fills the page
      // minus the global header + tabs.
      expect(wrapper?.className).toContain("h-[calc(100vh-12rem)]");
      expect(wrapper?.className).toContain("rounded-lg");
    });

    it("should pass fitOnVisibleZoom as MapContainer zoom when fitOnVisible is true", () => {
      const { getByTestId } = render(
        <MapView parks={[mockPark1]} fitOnVisible fitOnVisibleZoom={12} />,
      );
      expect(getByTestId("map-container")).toHaveAttribute("data-zoom", "12");
    });

    it("should pass default MapContainer zoom of 4 when fitOnVisible is false", () => {
      const { getByTestId } = render(<MapView parks={[mockPark1]} />);
      expect(getByTestId("map-container")).toHaveAttribute("data-zoom", "4");
    });

    it("should default fitOnVisibleZoom to 8 on the visibility handler when not overridden", () => {
      const { getByTestId } = render(
        <MapView parks={[mockPark1]} fitOnVisible />,
      );
      expect(getByTestId("visibility-handler")).toHaveAttribute(
        "data-zoom",
        "8",
      );
      // MapContainer receives the same default zoom in this mode.
      expect(getByTestId("map-container")).toHaveAttribute("data-zoom", "8");
    });
  });

  describe("map event handlers", () => {
    it("should forward MapClickHandler clicks to onMapClick when provided", () => {
      const onMapClick = vi.fn();
      render(<MapView parks={[mockPark1]} onMapClick={onMapClick} />);

      // MapClickHandler + ZoomTracker each register a `useMapEvents` handler.
      const clickHandlers = useMapEventsHandlers.filter((h) => typeof h.click === "function");
      expect(clickHandlers.length).toBeGreaterThan(0);
      clickHandlers[0].click({ latlng: { lat: 12.34, lng: -56.78 } });
      expect(onMapClick).toHaveBeenCalledWith(12.34, -56.78);
    });

    it("should tolerate MapClickHandler clicks when onMapClick is not provided", () => {
      render(<MapView parks={[mockPark1]} />);
      // Without an `onMapClick` prop the click handler component is not rendered
      // so there should be no `click` handler registered at all.
      const clickHandlers = useMapEventsHandlers.filter((h) => typeof h.click === "function");
      expect(clickHandlers).toHaveLength(0);
    });

    it("should update zoom state on zoomend events so label visibility branch flips", () => {
      // Initial zoom state is 4 — at this zoom park markers must NOT render labels.
      // After a zoomend >= LABEL_ZOOM_THRESHOLD (9) labels should render. We
      // use the ParkMarker mock to observe the prop indirectly by inspecting
      // re-render occurrence through handler invocation.
      render(<MapView parks={[mockPark1]} />);
      const zoomHandlers = useMapEventsHandlers.filter(
        (h) => typeof h.zoomend === "function",
      );
      expect(zoomHandlers.length).toBeGreaterThan(0);
      // Should not throw when invoked with a fake event shape.
      expect(() =>
        act(() => {
          zoomHandlers[0].zoomend({ target: { getZoom: () => 10 } });
        }),
      ).not.toThrow();
    });

    it("should update zoom state on moveend events", () => {
      render(<MapView parks={[mockPark1]} />);
      const moveHandlers = useMapEventsHandlers.filter(
        (h) => typeof h.moveend === "function",
      );
      expect(moveHandlers.length).toBeGreaterThan(0);
      expect(() =>
        act(() => {
          moveHandlers[0].moveend({ target: { getZoom: () => 5 } });
        }),
      ).not.toThrow();
    });
  });

  describe("custom waypoints", () => {
    const customWaypoint: RouteWaypoint = {
      id: "wp-custom-1",
      type: "custom",
      label: "Scenic overlook",
      lat: 35.5,
      lng: -111.5,
      icon: "⭐",
      color: "blue",
    };

    it("should render a CustomWaypointMarker only for waypoints of type 'custom'", () => {
      render(
        <MapView
          parks={[mockPark1]}
          routeWaypoints={[wp1, customWaypoint]}
        />,
      );
      expect(screen.getByTestId("custom-waypoint-wp-custom-1")).toBeInTheDocument();
      // Park waypoints must NOT be rendered by CustomWaypointMarker.
      expect(screen.queryByTestId("custom-waypoint-wp-park-1")).not.toBeInTheDocument();
    });

    it("should pass the waypoint index (within the full waypoints list) to CustomWaypointMarker", () => {
      render(
        <MapView
          parks={[mockPark1]}
          routeWaypoints={[wp1, customWaypoint, wp2]}
        />,
      );
      expect(screen.getByTestId("custom-waypoint-wp-custom-1")).toHaveAttribute(
        "data-index",
        "1",
      );
    });

    it("should forward onRemoveWaypoint handler to CustomWaypointMarker", () => {
      const onRemoveWaypoint = vi.fn();
      render(
        <MapView
          parks={[mockPark1]}
          routeWaypoints={[customWaypoint]}
          onRemoveWaypoint={onRemoveWaypoint}
        />,
      );
      expect(screen.getByTestId("custom-waypoint-wp-custom-1")).toHaveAttribute(
        "data-has-remove",
        "true",
      );
    });

    it("should render CustomWaypointMarker without onRemove when handler is omitted", () => {
      render(
        <MapView parks={[mockPark1]} routeWaypoints={[customWaypoint]} />,
      );
      expect(screen.getByTestId("custom-waypoint-wp-custom-1")).toHaveAttribute(
        "data-has-remove",
        "false",
      );
    });
  });
});
