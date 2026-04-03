import { render } from "@testing-library/react";
import { RoutePolylines } from "@/features/map/components/RoutePolylines";
import { vi } from "vitest";
import type { RouteWaypoint } from "@/lib/types";

// Mock react-leaflet
vi.mock("react-leaflet", () => ({
  Polyline: ({ children, positions, color }: any) => (
    <div
      data-testid="polyline"
      data-color={color}
      data-positions={JSON.stringify(positions)}
    >
      {children}
    </div>
  ),
  Tooltip: ({ children }: any) => <div data-testid="tooltip">{children}</div>,
}));

// Mock distance calculation
vi.mock("@/features/map/utils/distance", () => ({
  calculateDistance: () => 150,
}));

describe("RoutePolylines", () => {
  const makeWaypoint = (
    id: string,
    lat: number,
    lng: number,
  ): RouteWaypoint => ({
    id,
    type: "park",
    label: `Park ${id}`,
    parkId: id,
    parkSlug: id,
    lat,
    lng,
  });

  const wp1 = makeWaypoint("wp-1", 34.0522, -118.2437);
  const wp2 = makeWaypoint("wp-2", 36.7783, -119.4179);
  const wp3 = makeWaypoint("wp-3", 36.1699, -115.1398);

  it("should return null when less than 2 waypoints", () => {
    const { container } = render(<RoutePolylines routeParks={[wp1]} />);
    expect(container.firstChild).toBeNull();
  });

  it("should return null when route is empty", () => {
    const { container } = render(<RoutePolylines routeParks={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render polyline between two waypoints (fallback mode)", () => {
    const { getAllByTestId } = render(
      <RoutePolylines routeParks={[wp1, wp2]} />,
    );

    const polylines = getAllByTestId("polyline");
    expect(polylines).toHaveLength(1);
  });

  it("should render multiple polylines for multiple waypoints", () => {
    const { getAllByTestId } = render(
      <RoutePolylines routeParks={[wp1, wp2, wp3]} />,
    );

    const polylines = getAllByTestId("polyline");
    expect(polylines).toHaveLength(2);
  });

  it("should display distance in tooltip", () => {
    const { getAllByTestId } = render(
      <RoutePolylines routeParks={[wp1, wp2]} />,
    );

    const tooltips = getAllByTestId("tooltip");
    expect(tooltips[0]).toHaveTextContent("150 mi");
  });

  it("should use correct positions for polyline", () => {
    const { getAllByTestId } = render(
      <RoutePolylines routeParks={[wp1, wp2]} />,
    );

    const polyline = getAllByTestId("polyline")[0];
    const positions = JSON.parse(
      polyline.getAttribute("data-positions") || "[]",
    );

    expect(positions).toEqual([
      [34.0522, -118.2437],
      [36.7783, -119.4179],
    ]);
  });

  it("should render with blue color", () => {
    const { getAllByTestId } = render(
      <RoutePolylines routeParks={[wp1, wp2]} />,
    );

    const polyline = getAllByTestId("polyline")[0];
    expect(polyline).toHaveAttribute("data-color", "#3b82f6");
  });

  it("should render solid polyline when routeGeometry is provided", () => {
    const geometry: GeoJSON.LineString = {
      type: "LineString",
      coordinates: [
        [-118.2437, 34.0522],
        [-119.4179, 36.7783],
      ],
    };

    const { getAllByTestId, queryAllByTestId } = render(
      <RoutePolylines routeParks={[wp1, wp2]} routeGeometry={geometry} />,
    );

    const polylines = getAllByTestId("polyline");
    // Should render exactly 1 polyline (the solid route, not per-segment)
    expect(polylines).toHaveLength(1);
    // Should have no tooltips (no distance labels for real route)
    expect(queryAllByTestId("tooltip")).toHaveLength(0);
  });

  it("should convert GeoJSON [lng,lat] to Leaflet [lat,lng]", () => {
    const geometry: GeoJSON.LineString = {
      type: "LineString",
      coordinates: [
        [-118.2437, 34.0522],
        [-119.4179, 36.7783],
      ],
    };

    const { getAllByTestId } = render(
      <RoutePolylines routeParks={[wp1, wp2]} routeGeometry={geometry} />,
    );

    const polyline = getAllByTestId("polyline")[0];
    const positions = JSON.parse(
      polyline.getAttribute("data-positions") || "[]",
    );

    // GeoJSON coords [lng, lat] should be flipped to [lat, lng] for Leaflet
    expect(positions[0]).toEqual([34.0522, -118.2437]);
    expect(positions[1]).toEqual([36.7783, -119.4179]);
  });
});
