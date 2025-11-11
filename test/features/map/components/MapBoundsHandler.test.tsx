import { render } from "@testing-library/react";
import { MapBoundsHandler } from "@/features/map/components/MapBoundsHandler";
import { vi } from "vitest";
import type { Park } from "@/lib/types";

// Mock react-leaflet
const mockSetView = vi.fn();
const mockFitBounds = vi.fn();

vi.mock("react-leaflet", () => ({
  useMap: () => ({
    setView: mockSetView,
    fitBounds: mockFitBounds,
  }),
}));

// Mock leaflet
vi.mock("leaflet", () => ({
  default: {
    latLngBounds: (coords: [number, number][]) => ({
      _coords: coords,
    }),
  },
}));

describe("MapBoundsHandler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockPark: Park = {
    id: "park-1",
    name: "Test Park",
    state: "CA",
    coords: { lat: 34.0522, lng: -118.2437 },
    utvAllowed: true,
    terrain: [],
    difficulty: [],
    amenities: [],
  };

  it("should render without crashing", () => {
    render(<MapBoundsHandler parks={[]} />);
    expect(true).toBe(true);
  });

  it("should set default view when no parks have coordinates", () => {
    const parksWithoutCoords: Park[] = [{ ...mockPark, coords: undefined }];

    render(<MapBoundsHandler parks={parksWithoutCoords} />);

    expect(mockSetView).toHaveBeenCalledWith([39.8283, -98.5795], 4);
  });

  it("should set default view when parks array is empty", () => {
    render(<MapBoundsHandler parks={[]} />);

    expect(mockSetView).toHaveBeenCalledWith([39.8283, -98.5795], 4);
  });

  it("should center on single park", () => {
    render(<MapBoundsHandler parks={[mockPark]} />);

    expect(mockSetView).toHaveBeenCalledWith([34.0522, -118.2437], 8);
  });

  it("should fit bounds for multiple parks", () => {
    const parks: Park[] = [
      mockPark,
      {
        ...mockPark,
        id: "park-2",
        coords: { lat: 36.7783, lng: -119.4179 },
      },
    ];

    render(<MapBoundsHandler parks={parks} />);

    expect(mockFitBounds).toHaveBeenCalled();
    const boundsArg = mockFitBounds.mock.calls[0][0];
    expect(boundsArg).toBeDefined();
    expect(mockFitBounds.mock.calls[0][1]).toEqual({
      padding: [50, 50],
      maxZoom: 12,
    });
  });

  it("should filter out parks without coordinates before fitting bounds", () => {
    const parks: Park[] = [
      mockPark,
      { ...mockPark, id: "park-2", coords: undefined },
      {
        ...mockPark,
        id: "park-3",
        coords: { lat: 36.7783, lng: -119.4179 },
      },
    ];

    render(<MapBoundsHandler parks={parks} />);

    expect(mockFitBounds).toHaveBeenCalled();
  });

  it("should return null (render nothing)", () => {
    const { container } = render(<MapBoundsHandler parks={[]} />);

    expect(container.firstChild).toBeNull();
  });
});
