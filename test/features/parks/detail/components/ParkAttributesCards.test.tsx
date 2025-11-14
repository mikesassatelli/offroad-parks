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
    state: "California",
    coords: { lat: 34, lng: -118 },
    terrain: ["sand", "rocks", "mud"],
    amenities: ["camping", "restrooms", "showers"],
    difficulty: ["easy", "moderate", "difficult"],
    vehicleTypes: [],
  };

  it("should render all three cards", () => {
    render(<ParkAttributesCards park={mockPark} />);

    expect(screen.getByText("Terrain Types")).toBeInTheDocument();
    expect(screen.getByText("Difficulty Levels")).toBeInTheDocument();
    expect(screen.getByText("Amenities")).toBeInTheDocument();
  });

  it("should render terrain badges", () => {
    render(<ParkAttributesCards park={mockPark} />);

    expect(screen.getByText("sand")).toBeInTheDocument();
    expect(screen.getByText("rocks")).toBeInTheDocument();
    expect(screen.getByText("mud")).toBeInTheDocument();
  });

  it("should render terrain badges with outline variant", () => {
    render(<ParkAttributesCards park={mockPark} />);

    const sandBadge = screen.getByText("sand");
    expect(sandBadge).toHaveAttribute("data-variant", "outline");
    expect(sandBadge).toHaveClass("capitalize");
  });

  it("should render difficulty badges", () => {
    render(<ParkAttributesCards park={mockPark} />);

    expect(screen.getByText("easy")).toBeInTheDocument();
    expect(screen.getByText("moderate")).toBeInTheDocument();
    expect(screen.getByText("difficult")).toBeInTheDocument();
  });

  it("should render difficulty badges with secondary variant", () => {
    render(<ParkAttributesCards park={mockPark} />);

    const easyBadge = screen.getByText("easy");
    expect(easyBadge).toHaveAttribute("data-variant", "secondary");
    expect(easyBadge).toHaveClass("capitalize");
  });

  it("should render amenity badges", () => {
    render(<ParkAttributesCards park={mockPark} />);

    expect(screen.getByText("camping")).toBeInTheDocument();
    expect(screen.getByText("restrooms")).toBeInTheDocument();
    expect(screen.getByText("showers")).toBeInTheDocument();
  });

  it("should render amenity badges with default variant", () => {
    render(<ParkAttributesCards park={mockPark} />);

    const campingBadge = screen.getByText("camping");
    expect(campingBadge).toHaveClass("capitalize");
  });

  it("should handle empty terrain array", () => {
    const parkNoTerrain = { ...mockPark, terrain: [] };
    render(<ParkAttributesCards park={parkNoTerrain} />);

    expect(screen.getByText("Terrain Types")).toBeInTheDocument();
    expect(screen.queryByText("sand")).not.toBeInTheDocument();
  });

  it("should handle empty difficulty array", () => {
    const parkNoDifficulty = { ...mockPark, difficulty: [] };
    render(<ParkAttributesCards park={parkNoDifficulty} />);

    expect(screen.getByText("Difficulty Levels")).toBeInTheDocument();
    expect(screen.queryByText("easy")).not.toBeInTheDocument();
  });

  it("should handle empty amenities array", () => {
    const parkNoAmenities = { ...mockPark, amenities: [] };
    render(<ParkAttributesCards park={parkNoAmenities} />);

    expect(screen.getByText("Amenities")).toBeInTheDocument();
    expect(screen.queryByText("camping")).not.toBeInTheDocument();
  });

  it("should handle park with all empty arrays", () => {
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

    render(<ParkAttributesCards park={minimalPark} />);

    expect(screen.getByText("Terrain Types")).toBeInTheDocument();
    expect(screen.getByText("Difficulty Levels")).toBeInTheDocument();
    expect(screen.getByText("Amenities")).toBeInTheDocument();
  });

  it("should render single item in each category", () => {
    const singleItemPark: Park = {
      ...mockPark,
      terrain: ["sand"],
      difficulty: ["easy"],
      amenities: ["camping"],
      vehicleTypes: [],
    };

    render(<ParkAttributesCards park={singleItemPark} />);

    expect(screen.getByText("sand")).toBeInTheDocument();
    expect(screen.getByText("easy")).toBeInTheDocument();
    expect(screen.getByText("camping")).toBeInTheDocument();
  });
});
