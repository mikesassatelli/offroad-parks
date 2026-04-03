import { render, screen } from "@testing-library/react";
import { MapView } from "@/features/map/MapView";
import { vi } from "vitest";
import type { Park, RouteWaypoint } from "@/lib/types";

// Mock react-leaflet
vi.mock("react-leaflet", () => ({
  MapContainer: ({ children, center }: any) => (
    <div data-testid="map-container" data-center={JSON.stringify(center)}>
      {children}
    </div>
  ),
  TileLayer: () => <div data-testid="tile-layer" />,
  useMapEvents: vi.fn(() => null),
}));

// Mock child components
vi.mock("@/features/map/components/MapBoundsHandler", () => ({
  MapBoundsHandler: ({ parks }: any) => (
    <div data-testid="bounds-handler" data-parks-count={parks.length} />
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
});
