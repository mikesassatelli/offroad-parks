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

  it("should render park information with complete data", () => {
    render(
      <ParkCard
        park={mockPark}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    expect(screen.getByText("Test Park")).toBeInTheDocument();
    expect(screen.getByText(/Los Angeles, California/i)).toBeInTheDocument();
    expect(screen.getByText(/\$25/)).toBeInTheDocument();
    expect(screen.getByText(/50/)).toBeInTheDocument();
    expect(screen.getByText(/sand/i)).toBeInTheDocument();
    expect(screen.getByText(/rocks/i)).toBeInTheDocument();
  });

  it("should render park with minimal data", () => {
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
});
