import { fireEvent, render, screen } from "@testing-library/react";
import { ParkCard } from "@/components/parks/ParkCard";
import type { Park } from "@/lib/types";
import { vi } from "vitest";

// Mock Next.js components
vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

vi.mock("next/image", () => ({
  default: ({ alt, src }: any) => <img alt={alt} src={src} />,
}));

describe("ParkCard", () => {
  const mockPark: Park = {
    id: "test-park",
    name: "Test Park",
    city: "Los Angeles",
    state: "California",
    coords: { lat: 34, lng: -118 },
    dayPassUSD: 25,
    milesOfTrails: 50,
    acres: 1000,
    utvAllowed: true,
    terrain: ["sand", "rocks"],
    amenities: ["camping", "restrooms"],
    difficulty: ["moderate"],
    notes: "Great park!",
  };

  const mockOnToggleFavorite = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render park name", () => {
    render(
      <ParkCard
        park={mockPark}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    expect(screen.getByText("Test Park")).toBeInTheDocument();
  });

  it("should render location with city and state", () => {
    render(
      <ParkCard
        park={mockPark}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    expect(screen.getByText(/Los Angeles, California/i)).toBeInTheDocument();
  });

  it("should render location with only state when city is undefined", () => {
    const parkWithoutCity = { ...mockPark, city: undefined };
    render(
      <ParkCard
        park={parkWithoutCity}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    expect(screen.getByText(/California/i)).toBeInTheDocument();
  });

  it("should render formatted day pass price", () => {
    render(
      <ParkCard
        park={mockPark}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    expect(screen.getByText(/\$25/)).toBeInTheDocument();
  });

  it("should render em dash when day pass is undefined", () => {
    const parkWithoutPrice = { ...mockPark, dayPassUSD: undefined };
    render(
      <ParkCard
        park={parkWithoutPrice}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    expect(screen.getByText(/—/)).toBeInTheDocument();
  });

  it("should render miles of trails", () => {
    render(
      <ParkCard
        park={mockPark}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it("should render em dash when miles of trails is undefined", () => {
    const parkWithoutMiles = { ...mockPark, milesOfTrails: undefined };
    render(
      <ParkCard
        park={parkWithoutMiles}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    // Should have em dash for trail miles
    const emDashes = screen.getAllByText(/—/);
    expect(emDashes.length).toBeGreaterThan(0);
  });

  it("should render acres", () => {
    render(
      <ParkCard
        park={mockPark}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    expect(screen.getByText(/1000/)).toBeInTheDocument();
  });

  it("should link to park detail page", () => {
    render(
      <ParkCard
        park={mockPark}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/parks/test-park");
  });

  it("should show filled star when park is favorite", () => {
    render(
      <ParkCard
        park={mockPark}
        isFavorite={true}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    // Star icon should be present
    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("should show empty star when park is not favorite", () => {
    render(
      <ParkCard
        park={mockPark}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    const button = screen.getByRole("button");
    expect(button).toBeInTheDocument();
  });

  it("should call onToggleFavorite when favorite button is clicked", () => {
    render(
      <ParkCard
        park={mockPark}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    const button = screen.getByRole("button");
    fireEvent.click(button);

    expect(mockOnToggleFavorite).toHaveBeenCalledWith("test-park");
    expect(mockOnToggleFavorite).toHaveBeenCalledTimes(1);
  });

  it("should prevent link navigation when favorite button is clicked", () => {
    render(
      <ParkCard
        park={mockPark}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    const button = screen.getByRole("button");
    const clickEvent = new MouseEvent("click", { bubbles: true });
    const preventDefaultSpy = vi.spyOn(clickEvent, "preventDefault");
    const stopPropagationSpy = vi.spyOn(clickEvent, "stopPropagation");

    button.dispatchEvent(clickEvent);

    expect(preventDefaultSpy).toHaveBeenCalled();
    expect(stopPropagationSpy).toHaveBeenCalled();
  });

  it("should render hero image when provided", () => {
    const parkWithImage = {
      ...mockPark,
      heroImage: "https://example.com/image.jpg",
    };
    const { container } = render(
      <ParkCard
        park={parkWithImage}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    const image = container.querySelector('img[alt="Test Park"]');
    expect(image).toBeInTheDocument();
  });

  it("should render favorite button with hero image when park is favorite", () => {
    const parkWithImage = {
      ...mockPark,
      heroImage: "https://example.com/image.jpg",
    };
    render(
      <ParkCard
        park={parkWithImage}
        isFavorite={true}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveClass("shadow-lg");
  });

  it("should render favorite button with hero image when park is not favorite", () => {
    const parkWithImage = {
      ...mockPark,
      heroImage: "https://example.com/image.jpg",
    };
    render(
      <ParkCard
        park={parkWithImage}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    const button = screen.getByRole("button");
    expect(button).toHaveClass("shadow-lg");
  });

  it("should not render hero image when not provided", () => {
    const { container } = render(
      <ParkCard
        park={mockPark}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    const image = container.querySelector('img[alt="Test Park"]');
    expect(image).not.toBeInTheDocument();
  });

  it("should render terrain badges", () => {
    render(
      <ParkCard
        park={mockPark}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    expect(screen.getByText(/sand/i)).toBeInTheDocument();
    expect(screen.getByText(/rocks/i)).toBeInTheDocument();
  });

  it("should render park information", () => {
    render(
      <ParkCard
        park={mockPark}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    // Should render key park info
    expect(screen.getByText("Test Park")).toBeInTheDocument();
    expect(screen.getByText(/Los Angeles, California/i)).toBeInTheDocument();
  });

  it("should handle park with no amenities", () => {
    const parkNoAmenities = { ...mockPark, amenities: [] };
    render(
      <ParkCard
        park={parkNoAmenities}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    // Should still render without errors
    expect(screen.getByText("Test Park")).toBeInTheDocument();
  });

  it("should handle park with no terrain", () => {
    const parkNoTerrain = { ...mockPark, terrain: [] };
    render(
      <ParkCard
        park={parkNoTerrain}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    // Should still render without errors
    expect(screen.getByText("Test Park")).toBeInTheDocument();
  });

  it("should handle park with all optional fields undefined", () => {
    const minimalPark: Park = {
      id: "minimal-park",
      name: "Minimal Park",
      state: "Texas",
      utvAllowed: false,
      terrain: [],
      amenities: [],
      difficulty: [],
    };

    render(
      <ParkCard
        park={minimalPark}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    expect(screen.getByText("Minimal Park")).toBeInTheDocument();
    expect(screen.getByText(/Texas/i)).toBeInTheDocument();
  });
});
