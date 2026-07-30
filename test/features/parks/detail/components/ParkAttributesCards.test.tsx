import { render, screen } from "@testing-library/react";
import { ParkAttributesCards } from "@/features/parks/detail/components/ParkAttributesCards";
import type { Park } from "@/lib/types";

describe("ParkAttributesCards (chip strip)", () => {
  const mockPark: Park = {
    id: "park-1",
    name: "Test Park",
    address: { state: "California" },
    coords: { lat: 34, lng: -118 },
    terrain: ["sand", "rocks", "mud"],
    amenities: ["restrooms", "showers"],
    camping: [],
    vehicleTypes: ["motorcycle", "atv", "sxs", "fullSize"],
  };

  it("renders one labeled row per non-empty attribute group", () => {
    render(<ParkAttributesCards park={mockPark} />);

    expect(screen.getByText("Terrain")).toBeInTheDocument();
    expect(screen.getByText("Vehicles")).toBeInTheDocument();
    expect(screen.getByText("Amenities")).toBeInTheDocument();
  });

  it("renders terrain chips with formatted labels", () => {
    render(<ParkAttributesCards park={mockPark} />);

    expect(screen.getByText("Sand")).toBeInTheDocument();
    expect(screen.getByText("Rocks")).toBeInTheDocument();
    expect(screen.getByText("Mud")).toBeInTheDocument();
  });

  it("renders amenity chips with formatted labels", () => {
    render(<ParkAttributesCards park={mockPark} />);

    expect(screen.getByText("Restrooms")).toBeInTheDocument();
    expect(screen.getByText("Showers")).toBeInTheDocument();
  });

  it("renders vehicle-type chips with human labels", () => {
    render(<ParkAttributesCards park={mockPark} />);

    expect(screen.getByText("Motorcycle")).toBeInTheDocument();
    expect(screen.getByText("ATV")).toBeInTheDocument();
    expect(screen.getByText("SxS")).toBeInTheDocument();
    expect(screen.getByText("Full-Size")).toBeInTheDocument();
  });

  it("formats motocrossTrack terrain as 'Motocross Track'", () => {
    render(
      <ParkAttributesCards
        park={{ ...mockPark, terrain: ["motocrossTrack"], amenities: [], vehicleTypes: [] }}
      />,
    );

    expect(screen.getByText("Motocross Track")).toBeInTheDocument();
  });

  it("formats picnicTable amenity as 'Picnic Table'", () => {
    render(
      <ParkAttributesCards
        park={{ ...mockPark, terrain: [], amenities: ["picnicTable"], vehicleTypes: [] }}
      />,
    );

    expect(screen.getByText("Picnic Table")).toBeInTheDocument();
  });

  it("hides the Terrain row when terrain is empty", () => {
    render(<ParkAttributesCards park={{ ...mockPark, terrain: [] }} />);

    expect(screen.queryByText("Terrain")).not.toBeInTheDocument();
    expect(screen.getByText("Amenities")).toBeInTheDocument();
  });

  it("hides the Amenities row when amenities is empty", () => {
    render(<ParkAttributesCards park={{ ...mockPark, amenities: [] }} />);

    expect(screen.queryByText("Amenities")).not.toBeInTheDocument();
    expect(screen.getByText("Terrain")).toBeInTheDocument();
  });

  it("renders nothing when a park has no terrain, amenities, or vehicle types", () => {
    const { container } = render(
      <ParkAttributesCards
        park={{
          id: "minimal",
          name: "Minimal Park",
          address: { state: "Texas" },
          coords: { lat: 30, lng: -98 },
          terrain: [],
          amenities: [],
          camping: [],
          vehicleTypes: [],
        }}
      />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
