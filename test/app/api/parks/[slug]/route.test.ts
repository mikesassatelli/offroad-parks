import { GET } from "@/app/api/parks/[slug]/route";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

// Mock Prisma
vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findUnique: vi.fn(),
    },
  },
}));

describe("GET /api/parks/[slug]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return a park by slug", async () => {
    // Arrange
    const mockPark = {
      id: "1",
      name: "Test Park",
      slug: "test-park",
      city: "Test City",
      state: "CA",
      latitude: 34.0522,
      longitude: -118.2437,
      website: "https://test.com",
      phone: "5551234567",
      dayPassUSD: 25,
      milesOfTrails: 50,
      acres: 1000,notes: "Great park",
      status: "APPROVED",
      terrain: [{ terrain: "sand" as const }],
      difficulty: [{ difficulty: "moderate" as const }],
      amenities: [{ amenity: "camping" as const }],
      vehicleTypes: [],
    };

    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);

    const params = Promise.resolve({ slug: "test-park" });
    const request = new Request("http://localhost:3000/api/parks/test-park");

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data).toEqual({
      id: "test-park", // slug used as id
      name: "Test Park",
      city: "Test City",
      state: "CA",
      coords: { lat: 34.0522, lng: -118.2437 },
      website: "https://test.com",
      phone: "5551234567",
      dayPassUSD: 25,
      milesOfTrails: 50,
      acres: 1000,notes: "Great park",
      terrain: ["sand"],
      difficulty: ["moderate"],
      amenities: ["camping"],
      vehicleTypes: [],
    });

    expect(prisma.park.findUnique).toHaveBeenCalledWith({
      where: {
        slug: "test-park",
        status: "APPROVED",
      },
      include: {
        terrain: true,
        difficulty: true,
        amenities: true,
        vehicleTypes: true,
      },
    });
  });

  it("should return 404 when park not found", async () => {
    // Arrange
    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);

    const params = Promise.resolve({ slug: "non-existent-park" });
    const request = new Request(
      "http://localhost:3000/api/parks/non-existent-park",
    );

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(data).toEqual({ error: "Park not found" });
  });

  it("should return 404 when park exists but is not approved", async () => {
    // Arrange
    // findUnique with status: "APPROVED" filter will return null
    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);

    const params = Promise.resolve({ slug: "pending-park" });
    const request = new Request("http://localhost:3000/api/parks/pending-park");

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(data).toEqual({ error: "Park not found" });
  });

  it("should handle database errors gracefully", async () => {
    // Arrange
    const dbError = new Error("Database connection failed");
    vi.mocked(prisma.park.findUnique).mockRejectedValue(dbError);

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const params = Promise.resolve({ slug: "test-park" });
    const request = new Request("http://localhost:3000/api/parks/test-park");

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to fetch park" });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error fetching park:",
      dbError,
    );

    consoleErrorSpy.mockRestore();
  });

  it("should transform park with all fields null except required ones", async () => {
    // Arrange
    const mockPark = {
      id: "1",
      name: "Minimal Park",
      slug: "minimal-park",
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
    };

    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);

    const params = Promise.resolve({ slug: "minimal-park" });
    const request = new Request("http://localhost:3000/api/parks/minimal-park");

    // Act
    const response = await GET(request, { params });
    const data = await response.json();

    // Assert
    expect(data).toEqual({
      id: "minimal-park",
      name: "Minimal Park",
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
  });

  it("should query with correct slug from params", async () => {
    // Arrange
    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);

    const params = Promise.resolve({ slug: "specific-slug-value" });
    const request = new Request(
      "http://localhost:3000/api/parks/specific-slug-value",
    );

    // Act
    await GET(request, { params });

    // Assert
    expect(prisma.park.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          slug: "specific-slug-value",
        }),
      }),
    );
  });
});
