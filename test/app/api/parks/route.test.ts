import { GET } from "@/app/api/parks/route";
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

describe("GET /api/parks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return all approved parks", async () => {
    // Arrange
    const mockParks = [
      {
        id: "1",
        name: "Test Park 1",
        slug: "test-park-1",
        city: "Test City",
        state: "CA",
        latitude: 34.0522,
        longitude: -118.2437,
        website: "https://test1.com",
        phone: "5551234567",
        dayPassUSD: 25,
        milesOfTrails: 50,
        acres: 1000,notes: "Great park",
        status: "APPROVED",
        terrain: [{ terrain: "sand" as const }],
        difficulty: [{ difficulty: "moderate" as const }],
        amenities: [{ amenity: "camping" as const }],
        vehicleTypes: [],
      },
      {
        id: "2",
        name: "Test Park 2",
        slug: "test-park-2",
        city: null,
        state: "TX",
        latitude: null,
        longitude: null,
        website: null,
        phone: null,
        dayPassUSD: null,
        milesOfTrails: null,
        acres: null,notes: null,
        status: "APPROVED",
        terrain: [],
        difficulty: [],
        amenities: [],
        vehicleTypes: [],
      },
    ];

    vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

    // Act
    const response = await GET();
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);

    // Verify first park transformation
    expect(data[0]).toEqual({
      id: "test-park-1", // slug used as id
      name: "Test Park 1",
      city: "Test City",
      state: "CA",
      coords: { lat: 34.0522, lng: -118.2437 },
      website: "https://test1.com",
      phone: "5551234567",
      dayPassUSD: 25,
      milesOfTrails: 50,
      acres: 1000,notes: "Great park",
      terrain: ["sand"],
      difficulty: ["moderate"],
      amenities: ["camping"],
      vehicleTypes: [],
    });

    // Verify second park (with null values)
    expect(data[1]).toEqual({
      id: "test-park-2",
      name: "Test Park 2",
      city: undefined,
      state: "TX",
      coords: undefined,
      website: undefined,
      phone: undefined,
      dayPassUSD: undefined,
      milesOfTrails: undefined,
      acres: undefined,notes: undefined,
      terrain: [],
      difficulty: [],
      amenities: [],
      vehicleTypes: [],
    });

    // Verify Prisma was called with correct filter
    expect(prisma.park.findMany).toHaveBeenCalledWith({
      where: {
        status: "APPROVED",
      },
      include: {
        terrain: true,
        difficulty: true,
        amenities: true,
        vehicleTypes: true,
      },
      orderBy: {
        name: "asc",
      },
    });
  });

  it("should return empty array when no parks exist", async () => {
    // Arrange
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);

    // Act
    const response = await GET();
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(0);
  });

  it("should only return APPROVED parks", async () => {
    // Arrange
    const mockParks = [
      {
        id: "1",
        name: "Approved Park",
        slug: "approved-park",
        city: null,
        state: "CA",
        latitude: null,
        longitude: null,
        website: null,
        phone: null,
        dayPassUSD: null,
        milesOfTrails: null,
        acres: null,notes: null,
        status: "APPROVED",
        terrain: [],
        difficulty: [],
        amenities: [],
        vehicleTypes: [],
      },
    ];

    vi.mocked(prisma.park.findMany).mockResolvedValue(mockParks as any);

    // Act
    await GET();

    // Assert - should filter by APPROVED status
    expect(prisma.park.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          status: "APPROVED",
        },
      }),
    );
  });

  it("should handle database errors gracefully", async () => {
    // Arrange
    const dbError = new Error("Database connection failed");
    vi.mocked(prisma.park.findMany).mockRejectedValue(dbError);

    // Mock console.error to avoid noise in test output
    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    // Act
    const response = await GET();
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to fetch parks" });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error fetching parks:",
      dbError,
    );

    // Cleanup
    consoleErrorSpy.mockRestore();
  });

  it("should transform parks with multiple terrain types", async () => {
    // Arrange
    const mockPark = {
      id: "1",
      name: "Multi-Terrain Park",
      slug: "multi-terrain-park",
      city: "Test",
      state: "CA",
      latitude: null,
      longitude: null,
      website: null,
      phone: null,
      dayPassUSD: null,
      milesOfTrails: null,
      acres: null,notes: null,
      status: "APPROVED",
      terrain: [
        { terrain: "sand" as const },
        { terrain: "rocks" as const },
        { terrain: "mud" as const },
      ],
      difficulty: [
        { difficulty: "moderate" as const },
        { difficulty: "difficult" as const },
      ],
      amenities: [
        { amenity: "camping" as const },
        { amenity: "restrooms" as const },
        { amenity: "fuel" as const },
      ],
      vehicleTypes: [],
    };

    vi.mocked(prisma.park.findMany).mockResolvedValue([mockPark] as any);

    // Act
    const response = await GET();
    const data = await response.json();

    // Assert
    expect(data[0].terrain).toEqual(["sand", "rocks", "mud"]);
    expect(data[0].difficulty).toEqual(["moderate", "difficult"]);
    expect(data[0].amenities).toEqual(["camping", "restrooms", "fuel"]);
  });

  it("should order parks by name ascending", async () => {
    // Arrange
    vi.mocked(prisma.park.findMany).mockResolvedValue([]);

    // Act
    await GET();

    // Assert
    expect(prisma.park.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: {
          name: "asc",
        },
      }),
    );
  });
});
