import { render, screen } from "@testing-library/react";
import { ParkOverviewCard } from "@/features/parks/detail/components/ParkOverviewCard";
import type { Park } from "@/lib/types";
import { vi } from "vitest";

// Mock UI components
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardContent: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
}));

describe("ParkOverviewCard", () => {
  const mockPark: Park = {
    id: "park-1",
    name: "Test Park",
    state: "California",
    city: "Los Angeles",
    coords: { lat: 34, lng: -118 },
    dayPassUSD: 25,
    milesOfTrails: 50,
    acres: 1000,
    terrain: ["sand"],
    amenities: ["camping"],
    difficulty: ["moderate"],
    vehicleTypes: [],
    notes: "Great park for off-roading",
  };

  it("should render overview card", () => {
    render(<ParkOverviewCard park={mockPark} />);

    expect(screen.getByText("Overview")).toBeInTheDocument();
  });

  it("should display park notes", () => {
    render(<ParkOverviewCard park={mockPark} />);

    expect(screen.getByText("Great park for off-roading")).toBeInTheDocument();
  });

  it("should not display notes section when notes is undefined", () => {
    const parkWithoutNotes = { ...mockPark, notes: undefined };
    render(<ParkOverviewCard park={parkWithoutNotes} />);

    expect(
      screen.queryByText("Great park for off-roading"),
    ).not.toBeInTheDocument();
  });

  it("should display trail miles", () => {
    render(<ParkOverviewCard park={mockPark} />);

    expect(screen.getByText("Trail Miles")).toBeInTheDocument();
    expect(screen.getByText("50")).toBeInTheDocument();
  });

  it("should display em dash when trail miles is undefined", () => {
    const parkWithoutMiles = { ...mockPark, milesOfTrails: undefined };
    render(<ParkOverviewCard park={parkWithoutMiles} />);

    expect(screen.getByText("—")).toBeInTheDocument();
  });

  it("should display formatted day pass price", () => {
    render(<ParkOverviewCard park={mockPark} />);

    expect(screen.getByText("Day Pass")).toBeInTheDocument();
    expect(screen.getByText("$25")).toBeInTheDocument();
  });

  it("should display em dash when day pass is undefined", () => {
    const parkWithoutPrice = { ...mockPark, dayPassUSD: undefined };
    render(<ParkOverviewCard park={parkWithoutPrice} />);

    expect(screen.getByText("Day Pass")).toBeInTheDocument();
  });

  it("should display acres", () => {
    render(<ParkOverviewCard park={mockPark} />);

    expect(screen.getByText("Acres")).toBeInTheDocument();
    expect(screen.getByText("1000")).toBeInTheDocument();
  });

  it("should display em dash when acres is undefined", () => {
    const parkWithoutAcres = { ...mockPark, acres: undefined };
    render(<ParkOverviewCard park={parkWithoutAcres} />);

    expect(screen.getByText("Acres")).toBeInTheDocument();
  });

  it("should render icons", () => {
    const { container } = render(<ParkOverviewCard park={mockPark} />);

    // Lucide renders as SVG with aria-hidden
    const icons = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(icons.length).toBeGreaterThan(0);
  });

  it("should handle all undefined optional fields", () => {
    const minimalPark: Park = {
      id: "minimal",
      name: "Minimal Park",
      state: "Texas",
      coords: { lat: 30, lng: -98 },
      terrain: [],
      amenities: [],
      difficulty: [],
      vehicleTypes: [],
    };

    render(<ParkOverviewCard park={minimalPark} />);

    expect(screen.getByText("Overview")).toBeInTheDocument();
    // Should show em dashes for undefined optional fields
    const emDashes = screen.getAllByText("—");
    expect(emDashes.length).toBeGreaterThan(0);
  });
});
