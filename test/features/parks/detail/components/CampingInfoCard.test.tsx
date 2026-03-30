import { render, screen } from "@testing-library/react";
import { CampingInfoCard } from "@/features/parks/detail/components/CampingInfoCard";
import type { Camping, Park } from "@/lib/types";
import { vi } from "vitest";

vi.mock("@/components/ui/card", () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div>{children}</div>,
  CardTitle: ({ children, className }: any) => (
    <h3 className={className}>{children}</h3>
  ),
  CardContent: ({ children, className }: any) => (
    <div className={className}>{children}</div>
  ),
}));

const basePark: Park = {
  id: "park-1",
  name: "Test Park",
  address: { state: "California" },
  terrain: [],
  amenities: [],
  camping: [],
  vehicleTypes: [],
};

describe("CampingInfoCard", () => {
  it("should not render when camping array is empty", () => {
    const { container } = render(<CampingInfoCard park={basePark} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render camping card when camping options exist", () => {
    const park = { ...basePark, camping: ["tent" as Camping] };
    render(<CampingInfoCard park={park} />);
    expect(screen.getByText("Camping")).toBeInTheDocument();
  });

  it("should display formatted camping type labels", () => {
    const park = {
      ...basePark,
      camping: ["tent", "rv30A", "cabin"] as Camping[],
    };
    render(<CampingInfoCard park={park} />);
    expect(screen.getByText("Tent / Primitive")).toBeInTheDocument();
    expect(screen.getByText("RV 30A")).toBeInTheDocument();
    expect(screen.getByText("Cabin")).toBeInTheDocument();
  });

  it("should render icons alongside camping labels", () => {
    const park = { ...basePark, camping: ["tent" as Camping] };
    const { container } = render(<CampingInfoCard park={park} />);
    const icons = container.querySelectorAll("svg");
    expect(icons.length).toBeGreaterThan(0);
  });

  it("should render all camping types", () => {
    const park = {
      ...basePark,
      camping: [
        "tent",
        "rv30A",
        "rv50A",
        "fullHookup",
        "cabin",
        "groupSite",
        "backcountry",
      ] as Camping[],
    };
    render(<CampingInfoCard park={park} />);
    expect(screen.getByText("Tent / Primitive")).toBeInTheDocument();
    expect(screen.getByText("RV 30A")).toBeInTheDocument();
    expect(screen.getByText("RV 50A")).toBeInTheDocument();
    expect(screen.getByText("Full Hookup")).toBeInTheDocument();
    expect(screen.getByText("Cabin")).toBeInTheDocument();
    expect(screen.getByText("Group Site")).toBeInTheDocument();
    expect(screen.getByText("Backcountry / Walk-in")).toBeInTheDocument();
  });

  it("should not show reservations section when no camping contacts", () => {
    const park = { ...basePark, camping: ["tent" as Camping] };
    render(<CampingInfoCard park={park} />);
    expect(screen.queryByText("Reservations")).not.toBeInTheDocument();
  });

  it("should show reservations website when campingWebsite provided", () => {
    const park = {
      ...basePark,
      camping: ["tent" as Camping],
      campingWebsite: "https://reserve.testpark.com",
    };
    render(<CampingInfoCard park={park} />);
    const link = screen.getByText("Reservations Website");
    expect(link).toHaveAttribute("href", "https://reserve.testpark.com");
    expect(link).toHaveAttribute("target", "_blank");
  });

  it("should show camping phone when provided", () => {
    const park = {
      ...basePark,
      camping: ["tent" as Camping],
      campingPhone: "5559876543",
    };
    const { container } = render(<CampingInfoCard park={park} />);
    const telLink = container.querySelector('a[href="tel:5559876543"]');
    expect(telLink).toBeInTheDocument();
  });

  it("should show both website and phone in reservations section", () => {
    const park = {
      ...basePark,
      camping: ["tent" as Camping],
      campingWebsite: "https://reserve.testpark.com",
      campingPhone: "5559876543",
    };
    render(<CampingInfoCard park={park} />);
    expect(screen.getByText("Reservations")).toBeInTheDocument();
    expect(screen.getByText("Reservations Website")).toBeInTheDocument();
  });
});
