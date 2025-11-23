import { render, screen } from "@testing-library/react";
import { ParkDetailsDialog } from "@/components/parks/ParkDetailsDialog";
import type { Park } from "@/lib/types";
import { vi } from "vitest";

// Mock Next.js components
vi.mock("next/link", () => ({
  default: ({ children, href }: any) => <a href={href}>{children}</a>,
}));

// Mock UI components
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

vi.mock("@/components/ui/button", () => ({
  Button: ({ children, onClick, variant, size }: any) => (
    <button onClick={onClick} data-variant={variant} data-size={size}>
      {children}
    </button>
  ),
}));

vi.mock("@/components/ui/dialog", () => ({
  Dialog: ({ children, open }: any) =>
    open ? <div data-testid="dialog">{children}</div> : null,
  DialogContent: ({ children }: any) => <div>{children}</div>,
  DialogHeader: ({ children }: any) => <div>{children}</div>,
  DialogTitle: ({ children }: any) => <h2>{children}</h2>,
  DialogDescription: ({ children }: any) => <p>{children}</p>,
}));

describe("ParkDetailsDialog", () => {
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
    notes: "Great park for beginners!",
    website: "https://testpark.com",
    phone: "5551234567",
  };

  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return null when park is null", () => {
    const { container } = render(
      <ParkDetailsDialog park={null} isOpen={true} onClose={mockOnClose} />,
    );

    expect(container.firstChild).toBeNull();
  });

  it("should not render when isOpen is false", () => {
    const { queryByTestId } = render(
      <ParkDetailsDialog
        park={mockPark}
        isOpen={false}
        onClose={mockOnClose}
      />,
    );

    expect(queryByTestId("dialog")).not.toBeInTheDocument();
  });

  it("should render when isOpen is true", () => {
    const { getByTestId } = render(
      <ParkDetailsDialog park={mockPark} isOpen={true} onClose={mockOnClose} />,
    );

    expect(getByTestId("dialog")).toBeInTheDocument();
  });

  it("should render park name as title", () => {
    render(
      <ParkDetailsDialog park={mockPark} isOpen={true} onClose={mockOnClose} />,
    );

    expect(screen.getByText("Test Park")).toBeInTheDocument();
  });

  it("should display location with city and state", () => {
    render(
      <ParkDetailsDialog park={mockPark} isOpen={true} onClose={mockOnClose} />,
    );

    expect(screen.getByText(/Los Angeles, California/)).toBeInTheDocument();
  });

  it("should display location with only state when city is undefined", () => {
    const parkWithoutCity = { ...mockPark, city: undefined };
    render(
      <ParkDetailsDialog
        park={parkWithoutCity}
        isOpen={true}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText(/California · 50 mi trails/)).toBeInTheDocument();
  });

  it("should display trail miles", () => {
    render(
      <ParkDetailsDialog park={mockPark} isOpen={true} onClose={mockOnClose} />,
    );

    expect(screen.getByText(/50 mi trails/)).toBeInTheDocument();
  });

  it("should display em dash when trail miles is undefined", () => {
    const parkWithoutMiles = { ...mockPark, milesOfTrails: undefined };
    render(
      <ParkDetailsDialog
        park={parkWithoutMiles}
        isOpen={true}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText(/— mi trails/)).toBeInTheDocument();
  });

  it("should display formatted day pass price", () => {
    render(
      <ParkDetailsDialog park={mockPark} isOpen={true} onClose={mockOnClose} />,
    );

    expect(screen.getByText(/\$25 day pass/)).toBeInTheDocument();
  });

  it("should display em dash for day pass when price is undefined", () => {
    const parkWithoutPrice = { ...mockPark, dayPassUSD: undefined };
    render(
      <ParkDetailsDialog
        park={parkWithoutPrice}
        isOpen={true}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText(/— day pass/)).toBeInTheDocument();
  });

  it("should display park notes", () => {
    render(
      <ParkDetailsDialog park={mockPark} isOpen={true} onClose={mockOnClose} />,
    );

    expect(screen.getByText("Great park for beginners!")).toBeInTheDocument();
  });

  it("should not display notes section when notes is undefined", () => {
    const parkWithoutNotes = { ...mockPark, notes: undefined };
    render(
      <ParkDetailsDialog
        park={parkWithoutNotes}
        isOpen={true}
        onClose={mockOnClose}
      />,
    );

    expect(
      screen.queryByText("Great park for beginners!"),
    ).not.toBeInTheDocument();
  });

  it("should display website link", () => {
    render(
      <ParkDetailsDialog park={mockPark} isOpen={true} onClose={mockOnClose} />,
    );

    const link = screen.getByText("Official site");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://testpark.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  it("should not display website link when website is undefined", () => {
    const parkWithoutWebsite = { ...mockPark, website: undefined };
    render(
      <ParkDetailsDialog
        park={parkWithoutWebsite}
        isOpen={true}
        onClose={mockOnClose}
      />,
    );

    expect(screen.queryByText("Official site")).not.toBeInTheDocument();
  });

  it("should display phone number", () => {
    render(
      <ParkDetailsDialog park={mockPark} isOpen={true} onClose={mockOnClose} />,
    );

    expect(screen.getByText(/Phone: 5551234567/)).toBeInTheDocument();
  });

  it("should not display phone when phone is undefined", () => {
    const parkWithoutPhone = { ...mockPark, phone: undefined };
    render(
      <ParkDetailsDialog
        park={parkWithoutPhone}
        isOpen={true}
        onClose={mockOnClose}
      />,
    );

    expect(screen.queryByText(/Phone:/)).not.toBeInTheDocument();
  });

  it("should render terrain badges", () => {
    render(
      <ParkDetailsDialog park={mockPark} isOpen={true} onClose={mockOnClose} />,
    );

    expect(screen.getByText("sand")).toBeInTheDocument();
    expect(screen.getByText("rocks")).toBeInTheDocument();
  });

  it("should render terrain badges with outline variant", () => {
    const { container } = render(
      <ParkDetailsDialog park={mockPark} isOpen={true} onClose={mockOnClose} />,
    );

    const sandBadge = screen.getByText("sand");
    expect(sandBadge).toHaveAttribute("data-variant", "outline");
    expect(sandBadge).toHaveClass("capitalize");
  });

  it("should render amenity badges", () => {
    render(
      <ParkDetailsDialog park={mockPark} isOpen={true} onClose={mockOnClose} />,
    );

    expect(screen.getByText("restrooms")).toBeInTheDocument();
  });

  it("should render amenity badges with secondary variant", () => {
    const { container } = render(
      <ParkDetailsDialog park={mockPark} isOpen={true} onClose={mockOnClose} />,
    );

    const restroomsBadge = screen.getByText("restrooms");
    expect(restroomsBadge).toHaveAttribute("data-variant", "secondary");
    expect(restroomsBadge).toHaveClass("capitalize");
  });

  it("should display verification disclaimer", () => {
    render(
      <ParkDetailsDialog park={mockPark} isOpen={true} onClose={mockOnClose} />,
    );

    expect(
      screen.getByText(/Always verify hours, passes, and vehicle regulations/),
    ).toBeInTheDocument();
  });

  it("should render Full Details link button", () => {
    render(
      <ParkDetailsDialog park={mockPark} isOpen={true} onClose={mockOnClose} />,
    );

    const button = screen.getByText("Full Details");
    expect(button).toBeInTheDocument();
  });

  it("should link to park detail page", () => {
    const { container } = render(
      <ParkDetailsDialog park={mockPark} isOpen={true} onClose={mockOnClose} />,
    );

    const link = container.querySelector('a[href="/parks/test-park"]');
    expect(link).toBeInTheDocument();
  });

  it("should handle empty terrain array", () => {
    const parkNoTerrain = { ...mockPark, terrain: [] };
    render(
      <ParkDetailsDialog
        park={parkNoTerrain}
        isOpen={true}
        onClose={mockOnClose}
      />,
    );

    // Should still render without errors
    expect(screen.getByText("Test Park")).toBeInTheDocument();
  });

  it("should handle empty amenities array", () => {
    const parkNoAmenities = { ...mockPark, amenities: [] };
    render(
      <ParkDetailsDialog
        park={parkNoAmenities}
        isOpen={true}
        onClose={mockOnClose}
      />,
    );

    // Should still render without errors
    expect(screen.getByText("Test Park")).toBeInTheDocument();
  });

  it("should render all optional fields when provided", () => {
    render(
      <ParkDetailsDialog park={mockPark} isOpen={true} onClose={mockOnClose} />,
    );

    expect(screen.getByText("Test Park")).toBeInTheDocument();
    expect(screen.getByText("Great park for beginners!")).toBeInTheDocument();
    expect(screen.getByText("Official site")).toBeInTheDocument();
    expect(screen.getByText(/Phone: 5551234567/)).toBeInTheDocument();
  });

  it("should render minimal park with only required fields", () => {
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
      <ParkDetailsDialog
        park={minimalPark}
        isOpen={true}
        onClose={mockOnClose}
      />,
    );

    expect(screen.getByText("Minimal Park")).toBeInTheDocument();
    expect(screen.getByText(/Texas/)).toBeInTheDocument();
  });
});
