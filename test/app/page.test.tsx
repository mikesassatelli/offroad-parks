import { render, screen } from "@testing-library/react";
import Page from "@/app/page";
import { getParkFacets, getParkMarkers, getParkPage } from "@/lib/park-query";
import { vi } from "vitest";
import type { ParkPage, ParkFacets } from "@/lib/park-query";
import type { Park } from "@/lib/types";

// Mock the server query module — the page just wires it into the client app.
vi.mock("@/lib/park-query", () => ({
  getParkPage: vi.fn(),
  getParkMarkers: vi.fn(),
  getParkFacets: vi.fn(),
}));

// Mock the main app component so we can assert the props the page passes.
vi.mock("@/components/ui/OffroadParksApp", () => ({
  default: ({ initialData, initialMarkers, facets }: any) => (
    <div data-testid="utv-parks-app">
      <div data-testid="parks-count">{initialData.parks.length} parks</div>
      <div data-testid="markers-count">{initialMarkers.length} markers</div>
      <div data-testid="states-count">{facets.states.length} states</div>
      {initialData.parks.map((park: Park) => (
        <div key={park.id} data-testid="park-item">
          {park.name}
        </div>
      ))}
    </div>
  ),
}));

const makePark = (id: string, name: string): Park => ({
  id,
  name,
  terrain: [],
  amenities: [],
  camping: [],
  vehicleTypes: [],
  address: { state: "California" },
});

describe("Homepage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const page: ParkPage = {
    parks: [makePark("test-park-1", "Test Park 1"), makePark("test-park-2", "Test Park 2")],
    hasMore: true,
    nextPage: 1,
    total: 30,
  };
  const markers: Park[] = [makePark("test-park-1", "Test Park 1")];
  const facets: ParkFacets = {
    states: ["California", "Colorado"],
    maxTrailMiles: 100,
    maxAcres: 2000,
  };

  // Helper: Next 16 passes searchParams as an async prop.
  const props = (
    sp: Record<string, string | string[] | undefined> = {},
  ) => ({ searchParams: Promise.resolve(sp) });

  it("renders the app with the server-rendered first page", async () => {
    vi.mocked(getParkPage).mockResolvedValue(page);
    vi.mocked(getParkMarkers).mockResolvedValue(markers);
    vi.mocked(getParkFacets).mockResolvedValue(facets);

    const component = await Page(props());
    render(component);

    expect(screen.getByTestId("utv-parks-app")).toBeInTheDocument();
    expect(screen.getByText("2 parks")).toBeInTheDocument();
    expect(screen.getByText("1 markers")).toBeInTheDocument();
    expect(screen.getByText("2 states")).toBeInTheDocument();
    expect(screen.getByText("Test Park 1")).toBeInTheDocument();
  });

  it("fetches page 0 with default (unfiltered, name-sorted) params", async () => {
    vi.mocked(getParkPage).mockResolvedValue(page);
    vi.mocked(getParkMarkers).mockResolvedValue(markers);
    vi.mocked(getParkFacets).mockResolvedValue(facets);

    await Page(props());

    expect(getParkPage).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "name", q: "", terrains: [] }),
      0,
    );
    expect(getParkMarkers).toHaveBeenCalledWith(
      expect.objectContaining({ sort: "name" }),
    );
    expect(getParkFacets).toHaveBeenCalled();
  });

  it("server-renders a FILTERED first page + markers from URL searchParams", async () => {
    vi.mocked(getParkPage).mockResolvedValue(page);
    vi.mocked(getParkMarkers).mockResolvedValue(markers);
    vi.mocked(getParkFacets).mockResolvedValue(facets);

    // Deep link: /?state=Arkansas
    await Page(props({ state: "Arkansas" }));

    expect(getParkPage).toHaveBeenCalledWith(
      expect.objectContaining({ state: "Arkansas" }),
      0,
    );
    expect(getParkMarkers).toHaveBeenCalledWith(
      expect.objectContaining({ state: "Arkansas" }),
    );
  });

  it("handles repeated multi-select params (array searchParams values)", async () => {
    vi.mocked(getParkPage).mockResolvedValue(page);
    vi.mocked(getParkMarkers).mockResolvedValue(markers);
    vi.mocked(getParkFacets).mockResolvedValue(facets);

    // /?terrain=sand&terrain=rocks&sort=rating
    await Page(props({ terrain: ["sand", "rocks"], sort: "rating" }));

    expect(getParkPage).toHaveBeenCalledWith(
      expect.objectContaining({ terrains: ["sand", "rocks"], sort: "rating" }),
      0,
    );
  });

  it("renders with an empty first page", async () => {
    vi.mocked(getParkPage).mockResolvedValue({
      parks: [],
      hasMore: false,
      nextPage: null,
      total: 0,
    });
    vi.mocked(getParkMarkers).mockResolvedValue([]);
    vi.mocked(getParkFacets).mockResolvedValue({
      states: [],
      maxTrailMiles: 500,
      maxAcres: 10000,
    });

    const component = await Page(props());
    render(component);

    expect(screen.getByTestId("utv-parks-app")).toBeInTheDocument();
    expect(screen.getByText("0 parks")).toBeInTheDocument();
  });
});
