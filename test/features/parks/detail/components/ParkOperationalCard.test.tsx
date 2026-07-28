import { render, screen } from "@testing-library/react";
import { ParkOperationalCard } from "@/features/parks/detail/components/ParkOperationalCard";
import type { Park } from "@/lib/types";
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

vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-variant={variant} className={className}>
      {children}
    </span>
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

describe("ParkOperationalCard", () => {
  it("should not render when no operational fields are set", () => {
    const { container } = render(<ParkOperationalCard park={basePark} />);
    expect(container.firstChild).toBeNull();
  });

  it("should render when at least one operational field is set", () => {
    const park = { ...basePark, datesOpen: "Year-round" };
    render(<ParkOperationalCard park={park} />);
    expect(screen.getByText("Park Details")).toBeInTheDocument();
  });

  it("should display datesOpen as a Season row", () => {
    const park = { ...basePark, datesOpen: "May 1 – October 31" };
    render(<ParkOperationalCard park={park} />);
    expect(screen.getByText("May 1 – October 31")).toBeInTheDocument();
    expect(screen.getByText("Season")).toBeInTheDocument();
  });

  it("renders a structured weekly schedule when hours are set", () => {
    const park: Park = {
      ...basePark,
      hours: {
        mon: { open: "08:00", close: "18:00" },
        tue: { open: "08:00", close: "18:00" },
        wed: null,
        thu: null,
        fri: null,
        sat: { closed: true },
        sun: null,
      },
    };
    render(<ParkOperationalCard park={park} />);
    // Card is shown purely because hours are present.
    expect(screen.getByText("Hours")).toBeInTheDocument();
    expect(screen.getByTestId("weekly-hours-list")).toBeInTheDocument();
    // Formatted 12h window appears (twice — Mon and Tue).
    expect(screen.getAllByText("8:00 AM – 6:00 PM")).toHaveLength(2);
    // Explicit closure renders as "Closed".
    expect(screen.getByText("Closed")).toBeInTheDocument();
    // Unspecified days render as an em dash placeholder.
    expect(screen.getAllByText("—").length).toBeGreaterThan(0);
  });

  it("does not render the Hours row when every day is unspecified", () => {
    const park: Park = {
      ...basePark,
      hours: {
        mon: null,
        tue: null,
        wed: null,
        thu: null,
        fri: null,
        sat: null,
        sun: null,
      },
    };
    const { container } = render(<ParkOperationalCard park={park} />);
    // All-null hours count as empty, so the card hides entirely.
    expect(container.firstChild).toBeNull();
  });

  it("should display formatted ownership", () => {
    const park = { ...basePark, ownership: "private" as const };
    render(<ParkOperationalCard park={park} />);
    expect(screen.getByText("Private")).toBeInTheDocument();
    expect(screen.getByText("Ownership")).toBeInTheDocument();
  });

  it("should display max vehicle width in inches", () => {
    const park = { ...basePark, maxVehicleWidthInches: 96 };
    render(<ParkOperationalCard park={park} />);
    expect(screen.getByText('96″')).toBeInTheDocument();
    expect(screen.getByText("Max Vehicle Width")).toBeInTheDocument();
  });

  it("should display noise limit in dBA", () => {
    const park = { ...basePark, noiseLimitDBA: 96 };
    render(<ParkOperationalCard park={park} />);
    expect(screen.getByText("96 dBA")).toBeInTheDocument();
    expect(screen.getByText("Noise Limit")).toBeInTheDocument();
  });

  it("should show permit required badge when permitRequired is true", () => {
    const park = { ...basePark, permitRequired: true };
    render(<ParkOperationalCard park={park} />);
    expect(screen.getByText("Permit Required")).toBeInTheDocument();
  });

  it("should show permit type when both permitRequired and permitType are set", () => {
    const park = { ...basePark, permitRequired: true, permitType: "OHV" };
    render(<ParkOperationalCard park={park} />);
    expect(screen.getByText("Permit: OHV")).toBeInTheDocument();
  });

  it("should show membership required badge when membershipRequired is true", () => {
    const park = { ...basePark, membershipRequired: true };
    render(<ParkOperationalCard park={park} />);
    expect(screen.getByText("Membership Required")).toBeInTheDocument();
  });

  it("should show flag required badge when flagsRequired is true", () => {
    const park = { ...basePark, flagsRequired: true };
    render(<ParkOperationalCard park={park} />);
    expect(screen.getByText("Flag Required")).toBeInTheDocument();
  });

  it("should show spark arrestor badge when sparkArrestorRequired is true", () => {
    const park = { ...basePark, sparkArrestorRequired: true };
    render(<ParkOperationalCard park={park} />);
    expect(screen.getByText("Spark Arrestor Required")).toBeInTheDocument();
  });

  it("should show helmets required badge when helmetsRequired is true", () => {
    const park = { ...basePark, helmetsRequired: true };
    render(<ParkOperationalCard park={park} />);
    expect(screen.getByText("Helmets Required")).toBeInTheDocument();
  });

  it("should not show requirement badges when boolean flags are false", () => {
    const park = {
      ...basePark,
      permitRequired: false,
      membershipRequired: false,
      flagsRequired: false,
      sparkArrestorRequired: false,
      helmetsRequired: false,
      datesOpen: "Year-round", // ensure card renders
    };
    render(<ParkOperationalCard park={park} />);
    expect(screen.queryByText("Permit Required")).not.toBeInTheDocument();
    expect(screen.queryByText("Membership Required")).not.toBeInTheDocument();
    expect(screen.queryByText("Flag Required")).not.toBeInTheDocument();
    expect(screen.queryByText("Spark Arrestor Required")).not.toBeInTheDocument();
    expect(screen.queryByText("Helmets Required")).not.toBeInTheDocument();
  });

  it("should show requirement badges with destructive variant", () => {
    const park = { ...basePark, permitRequired: true };
    render(<ParkOperationalCard park={park} />);
    const badge = screen.getByText("Permit Required");
    expect(badge).toHaveAttribute("data-variant", "destructive");
  });

  it("should show multiple requirements at once", () => {
    const park = {
      ...basePark,
      permitRequired: true,
      flagsRequired: true,
      sparkArrestorRequired: true,
    };
    render(<ParkOperationalCard park={park} />);
    expect(screen.getByText("Requirements")).toBeInTheDocument();
    expect(screen.getByText("Permit Required")).toBeInTheDocument();
    expect(screen.getByText("Flag Required")).toBeInTheDocument();
    expect(screen.getByText("Spark Arrestor Required")).toBeInTheDocument();
  });
});
