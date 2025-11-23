import { render, screen } from "@testing-library/react";
import { ParkContactSidebar } from "@/features/parks/detail/components/ParkContactSidebar";
import type { Park } from "@/lib/types";
import { vi } from "vitest";

// Mock UI components
vi.mock("@/components/ui/card", () => ({
  Card: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children }: any) => <h3>{children}</h3>,
  CardContent: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
}));

describe("ParkContactSidebar", () => {
  const basePark: Park = {
    id: "park-1",
    name: "Test Park",
    address: {
      state: "California",
    },
    coords: { lat: 34.0522, lng: -118.2437 },
    terrain: [],
    amenities: [],
    camping: [],
    vehicleTypes: [],
  };

  it("should render contact sidebar", () => {
    render(<ParkContactSidebar park={basePark} />);

    expect(screen.getByText("Contact & Links")).toBeInTheDocument();
  });

  it("should display website link when provided", () => {
    const park = { ...basePark, website: "https://testpark.com" };
    render(<ParkContactSidebar park={park} />);

    const link = screen.getByText("Official Website");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute("href", "https://testpark.com");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
  });

  it("should not display website link when not provided", () => {
    render(<ParkContactSidebar park={basePark} />);

    expect(screen.queryByText("Official Website")).not.toBeInTheDocument();
  });

  it("should display formatted phone number when provided", () => {
    const park = { ...basePark, phone: "5551234567" };
    const { container } = render(<ParkContactSidebar park={park} />);

    const telLink = container.querySelector('a[href="tel:5551234567"]');
    expect(telLink).toBeInTheDocument();
    expect(telLink?.textContent).toMatch(/555/);
  });

  it("should create tel link for phone number", () => {
    const park = { ...basePark, phone: "5551234567" };
    const { container } = render(<ParkContactSidebar park={park} />);

    const telLink = container.querySelector('a[href="tel:5551234567"]');
    expect(telLink).toBeInTheDocument();
  });

  it("should not display phone when not provided", () => {
    const { container } = render(<ParkContactSidebar park={basePark} />);

    const telLink = container.querySelector('a[href^="tel:"]');
    expect(telLink).not.toBeInTheDocument();
  });

  it("should display get directions link when coords provided", () => {
    render(<ParkContactSidebar park={basePark} />);

    const link = screen.getByText("Get Directions");
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute(
      "href",
      "https://www.google.com/maps/dir/?api=1&destination=34.0522,-118.2437",
    );
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("should display verification disclaimer", () => {
    render(<ParkContactSidebar park={basePark} />);

    expect(
      screen.getByText(/Always verify hours, passes, and vehicle regulations/),
    ).toBeInTheDocument();
  });

  it("should render all contact info when all fields provided", () => {
    const park = {
      ...basePark,
      website: "https://testpark.com",
      phone: "5551234567",
    };
    const { container } = render(<ParkContactSidebar park={park} />);

    expect(screen.getByText("Official Website")).toBeInTheDocument();
    expect(
      container.querySelector('a[href="tel:5551234567"]'),
    ).toBeInTheDocument();
    expect(screen.getByText("Get Directions")).toBeInTheDocument();
  });

  it("should render icons", () => {
    const park = {
      ...basePark,
      website: "https://testpark.com",
      phone: "5551234567",
    };
    const { container } = render(<ParkContactSidebar park={park} />);

    const icons = container.querySelectorAll('svg[aria-hidden="true"]');
    expect(icons.length).toBeGreaterThan(0);
  });

  it("should handle park with no contact info", () => {
    const minimalPark: Park = {
      id: "minimal",
      name: "Minimal Park",
      address: {
        state: "Texas",
      },
      coords: { lat: 30, lng: -98 },
      terrain: [],
      amenities: [],
      camping: [],
      vehicleTypes: [],
    };

    render(<ParkContactSidebar park={minimalPark} />);

    expect(screen.getByText("Contact & Links")).toBeInTheDocument();
    expect(screen.getByText("Get Directions")).toBeInTheDocument();
    expect(screen.queryByText("Official Website")).not.toBeInTheDocument();
  });

  it("should not have sticky positioning on card itself", () => {
    const { container } = render(<ParkContactSidebar park={basePark} />);

    // Sticky positioning is now on the parent container in ParkDetailPage
    const card = container.querySelector(".sticky");
    expect(card).not.toBeInTheDocument();
  });
});
