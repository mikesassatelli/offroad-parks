import { render, screen } from "@testing-library/react";
import Page from "@/app/page";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findMany: vi.fn(),
    },
  },
}));

// Mock the main app component
vi.mock("@/components/ui/OffroadParksApp", () => ({
  default: ({ parks }: any) => (
    <div data-testid="utv-parks-app">
      <h1>UTV Parks App</h1>
      <div data-testid="parks-count">{parks.length} parks</div>
      {parks.map((park: any) => (
        <div key={park.id} data-testid="park-item">
          {park.name}
        </div>
      ))}
    </div>
  ),
}));

describe("Homepage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render the app with parks data", async () => {
    const mockDbParks = [
      {
        id: "park-1",
        slug: "test-park-1",
        name: "Test Park 1",
        state: "California",
        city: "Los Angeles",
        latitude: 34.0522,
        longitude: -118.2437,
        dayPassUSD: 25,
        milesOfTrails: 50,
        acres: 1000,
        utvAllowed: true,
        website: "https://testpark1.com",
        phone: "5551234567",
        notes: "Great park",
        status: "APPROVED",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "user-1",
        terrain: [{ id: "1", name: "sand", parkId: "park-1" }],
        difficulty: [{ id: "1", level: "moderate", parkId: "park-1" }],
        amenities: [{ id: "1", name: "camping", parkId: "park-1" }],
        photos: [{ url: "https://example.com/photo1.jpg" }],
      },
      {
        id: "park-2",
        slug: "test-park-2",
        name: "Test Park 2",
        state: "Arizona",
        city: null,
        latitude: 33.4484,
        longitude: -112.074,
        dayPassUSD: null,
        milesOfTrails: null,
        acres: null,
        utvAllowed: true,
        website: null,
        phone: null,
        notes: null,
        status: "APPROVED",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "user-1",
        terrain: [{ id: "2", name: "rocks", parkId: "park-2" }],
        difficulty: [],
        amenities: [],
        photos: [],
      },
    ];

    vi.mocked(prisma.park.findMany).mockResolvedValue(mockDbParks as any);

    const component = await Page();
    render(component);

    expect(screen.getByTestId("utv-parks-app")).toBeInTheDocument();
    expect(screen.getByText("2 parks")).toBeInTheDocument();
  });

  it("should only fetch approved parks", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);

    await Page();

    expect(prisma.park.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: "APPROVED" },
      }),
    );
  });

  it("should include terrain, difficulty, and amenities", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);

    await Page();

    expect(prisma.park.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          terrain: true,
          difficulty: true,
          amenities: true,
        }),
      }),
    );
  });

  it("should fetch approved photos", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);

    await Page();

    expect(prisma.park.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        include: expect.objectContaining({
          photos: expect.objectContaining({
            where: { status: "APPROVED" },
            take: 1,
          }),
        }),
      }),
    );
  });

  it("should order parks by name", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);

    await Page();

    expect(prisma.park.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { name: "asc" },
      }),
    );
  });

  it("should handle parks with hero images", async () => {
    const mockDbParks = [
      {
        id: "park-1",
        slug: "test-park",
        name: "Test Park",
        state: "California",
        city: "LA",
        latitude: 34,
        longitude: -118,
        dayPassUSD: 25,
        milesOfTrails: 50,
        acres: 1000,
        utvAllowed: true,
        website: null,
        phone: null,
        notes: null,
        status: "APPROVED",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "user-1",
        terrain: [],
        difficulty: [],
        amenities: [],
        photos: [{ url: "https://example.com/hero.jpg" }],
      },
    ];

    vi.mocked(prisma.park.findMany).mockResolvedValue(mockDbParks as any);

    const component = await Page();
    render(component);

    expect(screen.getByText("Test Park")).toBeInTheDocument();
  });

  it("should handle parks without hero images", async () => {
    const mockDbParks = [
      {
        id: "park-1",
        slug: "test-park",
        name: "Test Park No Photo",
        state: "Texas",
        city: null,
        latitude: 30,
        longitude: -98,
        dayPassUSD: null,
        milesOfTrails: null,
        acres: null,
        utvAllowed: false,
        website: null,
        phone: null,
        notes: null,
        status: "APPROVED",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "user-1",
        terrain: [],
        difficulty: [],
        amenities: [],
        photos: [],
      },
    ];

    vi.mocked(prisma.park.findMany).mockResolvedValue(mockDbParks as any);

    const component = await Page();
    render(component);

    expect(screen.getByText("Test Park No Photo")).toBeInTheDocument();
  });

  it("should render with empty parks array", async () => {
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);

    const component = await Page();
    render(component);

    expect(screen.getByTestId("utv-parks-app")).toBeInTheDocument();
    expect(screen.getByText("0 parks")).toBeInTheDocument();
  });

  it("should transform database parks to client format", async () => {
    const mockDbParks = [
      {
        id: "park-1",
        slug: "test-park",
        name: "Test Park",
        state: "California",
        city: "LA",
        latitude: 34.0522,
        longitude: -118.2437,
        dayPassUSD: 25,
        milesOfTrails: 50,
        acres: 1000,
        utvAllowed: true,
        website: "https://test.com",
        phone: "5551234567",
        notes: "Test notes",
        status: "APPROVED",
        createdAt: new Date(),
        updatedAt: new Date(),
        createdBy: "user-1",
        terrain: [{ id: "1", name: "sand", parkId: "park-1" }],
        difficulty: [{ id: "1", level: "moderate", parkId: "park-1" }],
        amenities: [{ id: "1", name: "camping", parkId: "park-1" }],
        photos: [{ url: "https://example.com/photo.jpg" }],
      },
    ];

    vi.mocked(prisma.park.findMany).mockResolvedValue(mockDbParks as any);

    const component = await Page();
    render(component);

    expect(screen.getByText("Test Park")).toBeInTheDocument();
  });
});
