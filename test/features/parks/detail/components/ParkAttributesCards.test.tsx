import { render, screen } from "@testing-library/react";
import { ParkAttributesCards } from "@/features/parks/detail/components/ParkAttributesCards";
import type { Park } from "@/lib/types";
import { vi } from "vitest";

// Mock UI components
vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardContent: ({ children }: any) => <div>{children}</div>,
}));

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

describe("ParkAttributesCards", () => {
  const mockPark: Park = {
    id: "park-1",
    name: "Test Park",
    address: { state: "California" },
    coords: { lat: 34, lng: -118 },
    terrain: ["sand", "rocks", "mud"],
    amenities: ["restrooms", "showers"],
    camping: [],
    vehicleTypes: [],
  };

  it("should render all two cards", () => {
    render(<ParkAttributesCards park={mockPark} />);

    expect(screen.getByText("Terrain Types")).toBeInTheDocument();
    expect(screen.getByText("Amenities")).toBeInTheDocument();
  });

  it("should render terrain badges with formatted labels", () => {
    render(<ParkAttributesCards park={mockPark} />);

    expect(screen.getByText("Sand")).toBeInTheDocument();
    expect(screen.getByText("Rocks")).toBeInTheDocument();
    expect(screen.getByText("Mud")).toBeInTheDocument();
  });

  it("should render terrain badges with outline variant and no capitalize class", () => {
    render(<ParkAttributesCards park={mockPark} />);

    const sandBadge = screen.getByText("Sand");
    expect(sandBadge).toHaveAttribute("data-variant", "outline");
    expect(sandBadge).not.toHaveClass("capitalize");
  });

  it("should render amenity badges with formatted labels", () => {
    render(<ParkAttributesCards park={mockPark} />);

    expect(screen.getByText("Restrooms")).toBeInTheDocument();
    expect(screen.getByText("Showers")).toBeInTheDocument();
  });

  it("should render amenity badges without capitalize class", () => {
    render(<ParkAttributesCards park={mockPark} />);

    const restroomsBadge = screen.getByText("Restrooms");
    expect(restroomsBadge).not.toHaveClass("capitalize");
  });

  it("should format motocrossTrack terrain as 'Motocross Track'", () => {
    const parkWithMotocross: Park = {
      ...mockPark,
      terrain: ["motocrossTrack"],
      amenities: [],
    };
    render(<ParkAttributesCards park={parkWithMotocross} />);

    expect(screen.getByText("Motocross Track")).toBeInTheDocument();
  });

  it("should format picnicTable amenity as 'Picnic Table'", () => {
    const parkWithPicnic: Park = {
      ...mockPark,
      terrain: [],
      amenities: ["picnicTable"],
    };
    render(<ParkAttributesCards park={parkWithPicnic} />);

    expect(screen.getByText("Picnic Table")).toBeInTheDocument();
  });

  it("should handle empty terrain array", () => {
    const parkNoTerrain = { ...mockPark, terrain: [] };
    render(<ParkAttributesCards park={parkNoTerrain} />);

    expect(screen.getByText("Terrain Types")).toBeInTheDocument();
    expect(screen.queryByText("Sand")).not.toBeInTheDocument();
  });

  it("should handle empty amenities array", () => {
    const parkNoAmenities = { ...mockPark, amenities: [] };
    render(<ParkAttributesCards park={parkNoAmenities} />);

    expect(screen.getByText("Amenities")).toBeInTheDocument();
    expect(screen.queryByText("Restrooms")).not.toBeInTheDocument();
  });

  it("should handle park with all empty arrays", () => {
    const minimalPark: Park = {
      id: "minimal",
      name: "Minimal Park",
      address: { state: "Texas" },
      coords: { lat: 30, lng: -98 },
      terrain: [],
      amenities: [],
      camping: [],
      vehicleTypes: [],
    };

    render(<ParkAttributesCards park={minimalPark} />);

    expect(screen.getByText("Terrain Types")).toBeInTheDocument();
    expect(screen.getByText("Amenities")).toBeInTheDocument();
  });

  it("should render single item in each category with formatted labels", () => {
    const singleItemPark: Park = {
      ...mockPark,
      terrain: ["sand"],
      amenities: ["restrooms"],
      camping: [],
      vehicleTypes: [],
    };

    render(<ParkAttributesCards park={singleItemPark} />);

    expect(screen.getByText("Sand")).toBeInTheDocument();
    expect(screen.getByText("Restrooms")).toBeInTheDocument();
  });
});
