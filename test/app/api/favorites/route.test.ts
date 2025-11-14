import { GET, POST } from "@/app/api/favorites/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

// Mock auth and Prisma
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    userFavorite: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    park: {
      findUnique: vi.fn(),
    },
  },
}));

describe("GET /api/favorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when user is not authenticated", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(null as any);

    // Act
    const response = await GET();
    const data = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("should return user favorites", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    const mockFavorites = [
      {
        id: "fav-1",
        userId: "user-123",
        parkId: "park-1",
        createdAt: new Date("2024-01-01"),
        park: {
          id: "park-1",
          name: "Favorite Park 1",
          slug: "favorite-park-1",
          terrain: [{ terrain: "sand" }],
          difficulty: [{ difficulty: "moderate" }],
          amenities: [{ amenity: "camping" }],
          vehicleTypes: [],
        },
      },
      {
        id: "fav-2",
        userId: "user-123",
        parkId: "park-2",
        createdAt: new Date("2024-01-02"),
        park: {
          id: "park-2",
          name: "Favorite Park 2",
          slug: "favorite-park-2",
          terrain: [{ terrain: "rocks" }],
          difficulty: [{ difficulty: "difficult" }],
          amenities: [],
          vehicleTypes: [],
        },
      },
    ];

    vi.mocked(prisma.userFavorite.findMany).mockResolvedValue(
      mockFavorites as any,
    );

    // Act
    const response = await GET();
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(2);
    expect(data[0].park.name).toBe("Favorite Park 1");
    expect(data[1].park.name).toBe("Favorite Park 2");

    expect(prisma.userFavorite.findMany).toHaveBeenCalledWith({
      where: { userId: "user-123" },
      include: {
        park: {
          include: {
            terrain: true,
            difficulty: true,
            amenities: true,
            vehicleTypes: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("should return empty array when user has no favorites", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(prisma.userFavorite.findMany).mockResolvedValue([]);

    // Act
    const response = await GET();
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data).toHaveLength(0);
  });

  it("should order favorites by createdAt desc", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(prisma.userFavorite.findMany).mockResolvedValue([]);

    // Act
    await GET();

    // Assert
    expect(prisma.userFavorite.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
      }),
    );
  });
});

describe("POST /api/favorites", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when user is not authenticated", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new Request("http://localhost:3000/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parkId: "test-park" }),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("should return 400 when parkId is missing", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    const request = new Request("http://localhost:3000/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Park ID required" });
  });

  it("should return 404 when park not found by slug", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parkId: "non-existent-park" }),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(data).toEqual({ error: "Park not found" });
    expect(prisma.park.findUnique).toHaveBeenCalledWith({
      where: { slug: "non-existent-park" },
    });
  });

  it("should create favorite when park exists and not already favorited", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    const mockPark = {
      id: "park-db-id",
      slug: "test-park",
      name: "Test Park",
    };

    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.userFavorite.findUnique).mockResolvedValue(null);

    const mockCreatedFavorite = {
      id: "fav-123",
      userId: "user-123",
      parkId: "park-db-id",
      createdAt: new Date(),
    };

    vi.mocked(prisma.userFavorite.create).mockResolvedValue(
      mockCreatedFavorite as any,
    );

    const request = new Request("http://localhost:3000/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parkId: "test-park" }),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.favorite.id).toBe("fav-123");
    expect(data.favorite.userId).toBe("user-123");
    expect(data.favorite.parkId).toBe("park-db-id");
    expect(data.favorite.createdAt).toBeDefined();

    // Verify it used slug to find park
    expect(prisma.park.findUnique).toHaveBeenCalledWith({
      where: { slug: "test-park" },
    });

    // Verify it used database ID (not slug) for favorite
    expect(prisma.userFavorite.create).toHaveBeenCalledWith({
      data: {
        userId: "user-123",
        parkId: "park-db-id",
      },
    });
  });

  it("should return 400 when park is already favorited", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    const mockPark = {
      id: "park-db-id",
      slug: "test-park",
    };

    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);

    const existingFavorite = {
      id: "existing-fav",
      userId: "user-123",
      parkId: "park-db-id",
    };

    vi.mocked(prisma.userFavorite.findUnique).mockResolvedValue(
      existingFavorite as any,
    );

    const request = new Request("http://localhost:3000/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parkId: "test-park" }),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Already favorited" });

    // Should not create a new favorite
    expect(prisma.userFavorite.create).not.toHaveBeenCalled();
  });

  it("should check for existing favorite using composite key", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    const mockPark = {
      id: "park-db-id",
      slug: "test-park",
    };

    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.userFavorite.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.userFavorite.create).mockResolvedValue({} as any);

    const request = new Request("http://localhost:3000/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parkId: "test-park" }),
    });

    // Act
    await POST(request);

    // Assert
    expect(prisma.userFavorite.findUnique).toHaveBeenCalledWith({
      where: {
        userId_parkId: {
          userId: "user-123",
          parkId: "park-db-id",
        },
      },
    });
  });

  it("should handle slug to ID conversion correctly", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    // Park has slug 'my-park' but DB id 'uuid-12345'
    const mockPark = {
      id: "uuid-12345",
      slug: "my-park",
      name: "My Park",
    };

    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.userFavorite.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.userFavorite.create).mockResolvedValue({} as any);

    const request = new Request("http://localhost:3000/api/favorites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ parkId: "my-park" }), // Frontend sends slug
    });

    // Act
    await POST(request);

    // Assert
    // Should look up by slug
    expect(prisma.park.findUnique).toHaveBeenCalledWith({
      where: { slug: "my-park" },
    });

    // But create favorite with database ID
    expect(prisma.userFavorite.create).toHaveBeenCalledWith({
      data: {
        userId: "user-123",
        parkId: "uuid-12345", // Not 'my-park'
      },
    });
  });
});
