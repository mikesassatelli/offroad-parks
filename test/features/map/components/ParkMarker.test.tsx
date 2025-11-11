import { fireEvent, render, screen } from "@testing-library/react";
import { ParkMarker } from "@/features/map/components/ParkMarker";
import { vi } from "vitest";
import type { Park } from "@/lib/types";

// Mock react-leaflet
vi.mock("react-leaflet", () => ({
  Marker: ({ children, position }: any) => (
    <div data-testid="marker" data-position={JSON.stringify(position)}>
      {children}
    </div>
  ),
  Popup: ({ children }: any) => <div data-testid="popup">{children}</div>,
}));

// Mock Next.js Link
vi.mock("next/link", () => ({
  default: ({ href, children, className }: any) => (
    <a href={href} className={className}>
      {children}
    </a>
  ),
}));

describe("ParkMarker", () => {
  const mockPark: Park = {
    id: "park-1",
    name: "Test Park",
    state: "CA",
    city: "Los Angeles",
    coords: { lat: 34.0522, lng: -118.2437 },
    milesOfTrails: 50,
    dayPassUSD: 25,
    acres: 1000,
    utvAllowed: true,
    terrain: [],
    difficulty: [],
    amenities: [],
  };

  it("should return null when park has no coordinates", () => {
    const parkNoCoords = { ...mockPark, coords: undefined };
    const { container } = render(
      <ParkMarker park={parkNoCoords} isInRoute={false} routeIndex={0} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should render marker with correct position", () => {
    const { getByTestId } = render(
      <ParkMarker park={mockPark} isInRoute={false} routeIndex={0} />,
    );

    const marker = getByTestId("marker");
    expect(marker).toHaveAttribute(
      "data-position",
      JSON.stringify([34.0522, -118.2437]),
    );
  });

  it("should display park name", () => {
    render(<ParkMarker park={mockPark} isInRoute={false} routeIndex={0} />);

    expect(screen.getByText("Test Park")).toBeInTheDocument();
  });

  it("should display city and state", () => {
    render(<ParkMarker park={mockPark} isInRoute={false} routeIndex={0} />);

    expect(screen.getByText(/Los Angeles, CA/)).toBeInTheDocument();
  });

  it("should display state only when no city", () => {
    const parkNoCity = { ...mockPark, city: undefined };
    render(<ParkMarker park={parkNoCity} isInRoute={false} routeIndex={0} />);

    expect(screen.getByText("CA")).toBeInTheDocument();
  });

  it("should display trail miles", () => {
    render(<ParkMarker park={mockPark} isInRoute={false} routeIndex={0} />);

    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("should display day pass price", () => {
    render(<ParkMarker park={mockPark} isInRoute={false} routeIndex={0} />);

    expect(screen.getByText("$25")).toBeInTheDocument();
  });

  it("should display acres", () => {
    render(<ParkMarker park={mockPark} isInRoute={false} routeIndex={0} />);

    expect(screen.getByText("1000")).toBeInTheDocument();
  });

  it("should show em dash when data is missing", () => {
    const parkMinimal = {
      ...mockPark,
      milesOfTrails: undefined,
      acres: undefined,
      dayPassUSD: undefined,
    };

    render(<ParkMarker park={parkMinimal} isInRoute={false} routeIndex={0} />);

    const emDashes = screen.getAllByText("—");
    expect(emDashes.length).toBeGreaterThan(0);
  });

  it("should show route index when in route", () => {
    render(<ParkMarker park={mockPark} isInRoute={true} routeIndex={2} />);

    expect(screen.getByText("3")).toBeInTheDocument(); // routeIndex + 1
  });

  it("should not show route index when not in route", () => {
    render(<ParkMarker park={mockPark} isInRoute={false} routeIndex={0} />);

    const badge = screen.queryByText("1");
    expect(badge).not.toBeInTheDocument();
  });

  it("should show Add to Route button when not in route and handler provided", () => {
    const onAddToRoute = vi.fn();

    render(
      <ParkMarker
        park={mockPark}
        isInRoute={false}
        routeIndex={0}
        onAddToRoute={onAddToRoute}
      />,
    );

    expect(screen.getByText("Add to Route")).toBeInTheDocument();
  });

  it("should not show Add to Route button when in route", () => {
    const onAddToRoute = vi.fn();

    render(
      <ParkMarker
        park={mockPark}
        isInRoute={true}
        routeIndex={0}
        onAddToRoute={onAddToRoute}
      />,
    );

    expect(screen.queryByText("Add to Route")).not.toBeInTheDocument();
  });

  it("should not show Add to Route button when no handler provided", () => {
    render(<ParkMarker park={mockPark} isInRoute={false} routeIndex={0} />);

    expect(screen.queryByText("Add to Route")).not.toBeInTheDocument();
  });

  it("should call onAddToRoute when button is clicked", () => {
    const onAddToRoute = vi.fn();

    render(
      <ParkMarker
        park={mockPark}
        isInRoute={false}
        routeIndex={0}
        onAddToRoute={onAddToRoute}
      />,
    );

    const button = screen.getByText("Add to Route");
    fireEvent.mouseDown(button);

    expect(onAddToRoute).toHaveBeenCalledWith(mockPark);
  });

  it("should render View details link", () => {
    render(<ParkMarker park={mockPark} isInRoute={false} routeIndex={0} />);

    const link = screen.getByText(/View details/);
    expect(link).toHaveAttribute("href", "/parks/park-1");
  });

  it("should render popup", () => {
    const { getByTestId } = render(
      <ParkMarker park={mockPark} isInRoute={false} routeIndex={0} />,
    );

    expect(getByTestId("popup")).toBeInTheDocument();
  });
});
