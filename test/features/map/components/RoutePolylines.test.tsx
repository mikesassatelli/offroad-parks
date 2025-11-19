import { render } from "@testing-library/react";
import { RoutePolylines } from "@/features/map/components/RoutePolylines";
import { vi } from "vitest";
import type { Park } from "@/lib/types";

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
  const mockPark1: Park = {
    id: "park-1",
    name: "Park One",
    state: "CA",
    coords: { lat: 34.0522, lng: -118.2437 },
    terrain: [],
    difficulty: [],
    amenities: [],
    
      camping: [],vehicleTypes: [],
  };

  const mockPark2: Park = {
    id: "park-2",
    name: "Park Two",
    state: "CA",
    coords: { lat: 36.7783, lng: -119.4179 },
    terrain: [],
    difficulty: [],
    amenities: [],
    
      camping: [],vehicleTypes: [],
  };

  const mockPark3: Park = {
    id: "park-3",
    name: "Park Three",
    state: "NV",
    coords: { lat: 36.1699, lng: -115.1398 },
    terrain: [],
    difficulty: [],
    amenities: [],
    
      camping: [],vehicleTypes: [],
  };

  it("should return null when less than 2 parks", () => {
    const { container } = render(<RoutePolylines routeParks={[mockPark1]} />);
    expect(container.firstChild).toBeNull();
  });

  it("should return null when route is empty", () => {
    const { container } = render(<RoutePolylines routeParks={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render polyline between two parks", () => {
    const { getAllByTestId } = render(
      <RoutePolylines routeParks={[mockPark1, mockPark2]} />,
    );

    const polylines = getAllByTestId("polyline");
    expect(polylines).toHaveLength(1);
  });

  it("should render multiple polylines for multiple parks", () => {
    const { getAllByTestId } = render(
      <RoutePolylines routeParks={[mockPark1, mockPark2, mockPark3]} />,
    );

    const polylines = getAllByTestId("polyline");
    expect(polylines).toHaveLength(2); // n-1 segments for n parks
  });

  it("should display distance in tooltip", () => {
    const { getAllByTestId } = render(
      <RoutePolylines routeParks={[mockPark1, mockPark2]} />,
    );

    const tooltips = getAllByTestId("tooltip");
    expect(tooltips[0]).toHaveTextContent("150 mi");
  });

  it("should skip segments where park has no coordinates", () => {
    const parkNoCoords: Park = {
      ...mockPark1,
      id: "park-no-coords",
      coords: undefined,
    };

    const { container } = render(
      <RoutePolylines routeParks={[mockPark1, parkNoCoords]} />,
    );

    // Should render empty since second park has no coords
    const polylines = container.querySelectorAll('[data-testid="polyline"]');
    expect(polylines).toHaveLength(0);
  });

  it("should use correct positions for polyline", () => {
    const { getAllByTestId } = render(
      <RoutePolylines routeParks={[mockPark1, mockPark2]} />,
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
      <RoutePolylines routeParks={[mockPark1, mockPark2]} />,
    );

    const polyline = getAllByTestId("polyline")[0];
    expect(polyline).toHaveAttribute("data-color", "#3b82f6");
  });
});
