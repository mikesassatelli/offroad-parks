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

// Mock ConditionBadge so we can test latestCondition without rendering the full component
vi.mock("@/features/trail-conditions/ConditionBadge", () => ({
  ConditionBadge: ({ status }: any) => (
    <span data-testid="condition-badge" data-status={status}>
      {status}
    </span>
  ),
}));

describe("ParkCard", () => {
  const mockPark: Park = {
    id: "test-park",
    name: "Test Park",
    address: {
      city: "Los Angeles",
      state: "California",
    },
    coords: { lat: 34, lng: -118 },
    dayPassUSD: 25,
    milesOfTrails: 50,
    acres: 1000,
    terrain: ["sand", "rocks"],
    amenities: ["restrooms"],
    camping: [],
    vehicleTypes: [],
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
      address: {
        state: "Texas",
      },
      terrain: [],
      amenities: [],
      camping: [],
      vehicleTypes: [],
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

  // ── Trail condition badge (OP-37-41) ──────────────────────────────────────

  it("should show condition badge when park has a fresh latestCondition", () => {
    const parkWithCondition: Park = {
      ...mockPark,
      latestCondition: {
        status: "MUDDY",
        createdAt: new Date().toISOString(),
      },
    };

    render(
      <ParkCard
        park={parkWithCondition}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    const badge = screen.getByTestId("condition-badge");
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveAttribute("data-status", "MUDDY");
  });

  it("should not show condition badge when latestCondition is stale (>72h old)", () => {
    const staleDate = new Date(Date.now() - 73 * 60 * 60 * 1000).toISOString();
    const parkWithStaleCondition: Park = {
      ...mockPark,
      latestCondition: {
        status: "OPEN",
        createdAt: staleDate,
      },
    };

    render(
      <ParkCard
        park={parkWithStaleCondition}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    expect(screen.queryByTestId("condition-badge")).not.toBeInTheDocument();
  });

  it("should not show condition badge when no latestCondition", () => {
    render(
      <ParkCard
        park={mockPark}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    expect(screen.queryByTestId("condition-badge")).not.toBeInTheDocument();
  });

  // ── Distance display (OP-56) ──────────────────────────────────────────────

  it("should display formatted distance when distanceMi is provided", () => {
    render(
      <ParkCard
        park={mockPark}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
        distanceMi={4.2}
      />,
    );

    expect(screen.getByText(/4\.2 mi/)).toBeInTheDocument();
  });

  it("should display integer distance for 10+ miles", () => {
    render(
      <ParkCard
        park={mockPark}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
        distanceMi={142.7}
      />,
    );

    expect(screen.getByText(/143 mi/)).toBeInTheDocument();
  });

  it("should not display distance separator when distanceMi is not provided", () => {
    render(
      <ParkCard
        park={mockPark}
        isFavorite={false}
        onToggleFavorite={mockOnToggleFavorite}
      />,
    );

    // The · separator only appears when a distance is shown
    expect(screen.queryByText(/·/)).not.toBeInTheDocument();
  });

  // ── Hero image ────────────────────────────────────────────────────────────

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
