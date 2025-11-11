import { render, screen } from "@testing-library/react";
import { AmenityBadges, TerrainBadges } from "@/components/shared/ParkBadges";
import type { Amenity, Terrain } from "@/lib/types";
import { vi } from "vitest";

// Mock UI components
vi.mock("@/components/ui/badge", () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

describe("TerrainBadges", () => {
  it("should render terrain badges", () => {
    const terrain: Terrain[] = ["sand", "rocks", "mud"];
    render(<TerrainBadges terrain={terrain} />);

    expect(screen.getByText("sand")).toBeInTheDocument();
    expect(screen.getByText("rocks")).toBeInTheDocument();
    expect(screen.getByText("mud")).toBeInTheDocument();
  });

  it("should render badges with outline variant", () => {
    const terrain: Terrain[] = ["sand"];
    render(<TerrainBadges terrain={terrain} />);

    const badge = screen.getByText("sand");
    expect(badge).toHaveAttribute("data-variant", "outline");
  });

  it("should apply capitalize class to badges", () => {
    const terrain: Terrain[] = ["sand"];
    render(<TerrainBadges terrain={terrain} />);

    const badge = screen.getByText("sand");
    expect(badge).toHaveClass("capitalize");
  });

  it("should render empty when no terrain", () => {
    const terrain: Terrain[] = [];
    const { container } = render(<TerrainBadges terrain={terrain} />);

    const badges = container.querySelectorAll("span");
    expect(badges).toHaveLength(0);
  });

  it("should render all terrain types", () => {
    const terrain: Terrain[] = [
      "sand",
      "rocks",
      "mud",
      "dirt",
      "clay",
      "gravel",
    ];
    render(<TerrainBadges terrain={terrain} />);

    expect(screen.getByText("sand")).toBeInTheDocument();
    expect(screen.getByText("rocks")).toBeInTheDocument();
    expect(screen.getByText("mud")).toBeInTheDocument();
    expect(screen.getByText("dirt")).toBeInTheDocument();
    expect(screen.getByText("clay")).toBeInTheDocument();
    expect(screen.getByText("gravel")).toBeInTheDocument();
  });
});

describe("AmenityBadges", () => {
  it("should render amenity badges", () => {
    const amenities: Amenity[] = ["camping", "restrooms", "showers"];
    render(<AmenityBadges amenities={amenities} />);

    expect(screen.getByText("camping")).toBeInTheDocument();
    expect(screen.getByText("restrooms")).toBeInTheDocument();
    expect(screen.getByText("showers")).toBeInTheDocument();
  });

  it("should render badges with secondary variant", () => {
    const amenities: Amenity[] = ["camping"];
    render(<AmenityBadges amenities={amenities} />);

    const badge = screen.getByText("camping");
    expect(badge).toHaveAttribute("data-variant", "secondary");
  });

  it("should apply capitalize class to badges", () => {
    const amenities: Amenity[] = ["camping"];
    render(<AmenityBadges amenities={amenities} />);

    const badge = screen.getByText("camping");
    expect(badge).toHaveClass("capitalize");
  });

  it("should render empty when no amenities", () => {
    const amenities: Amenity[] = [];
    const { container } = render(<AmenityBadges amenities={amenities} />);

    const badges = container.querySelectorAll("span");
    expect(badges).toHaveLength(0);
  });

  it("should render all amenity types", () => {
    const amenities: Amenity[] = [
      "camping",
      "restrooms",
      "showers",
      "water",
      "electric",
      "wifi",
      "rv-hookups",
      "dump-station",
      "firewood",
      "store",
    ];
    render(<AmenityBadges amenities={amenities} />);

    expect(screen.getByText("camping")).toBeInTheDocument();
    expect(screen.getByText("restrooms")).toBeInTheDocument();
    expect(screen.getByText("showers")).toBeInTheDocument();
    expect(screen.getByText("water")).toBeInTheDocument();
    expect(screen.getByText("electric")).toBeInTheDocument();
    expect(screen.getByText("wifi")).toBeInTheDocument();
    expect(screen.getByText("rv-hookups")).toBeInTheDocument();
    expect(screen.getByText("dump-station")).toBeInTheDocument();
    expect(screen.getByText("firewood")).toBeInTheDocument();
    expect(screen.getByText("store")).toBeInTheDocument();
  });

  it("should handle single amenity", () => {
    const amenities: Amenity[] = ["restrooms"];
    render(<AmenityBadges amenities={amenities} />);

    expect(screen.getByText("restrooms")).toBeInTheDocument();
    expect(screen.queryByText("camping")).not.toBeInTheDocument();
  });
});
