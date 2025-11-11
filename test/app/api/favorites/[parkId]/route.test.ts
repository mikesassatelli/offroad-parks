import { DELETE } from "@/app/api/favorites/[parkId]/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

// Mock auth and Prisma
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findUnique: vi.fn(),
    },
    userFavorite: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe("DELETE /api/favorites/[parkId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when user is not authenticated", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new Request(
      "http://localhost:3000/api/favorites/test-park",
      {
        method: "DELETE",
      },
    );

    const params = Promise.resolve({ parkId: "test-park" });

    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("should return 401 when session has no user ID", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({ user: {} } as any);

    const request = new Request(
      "http://localhost:3000/api/favorites/test-park",
      {
        method: "DELETE",
      },
    );

    const params = Promise.resolve({ parkId: "test-park" });

    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("should return 404 when park not found by slug", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);

    const request = new Request(
      "http://localhost:3000/api/favorites/non-existent-park",
      {
        method: "DELETE",
      },
    );

    const params = Promise.resolve({ parkId: "non-existent-park" });

    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(data).toEqual({ error: "Park not found" });
    expect(prisma.park.findUnique).toHaveBeenCalledWith({
      where: { slug: "non-existent-park" },
    });
  });

  it("should return 404 when favorite does not exist", async () => {
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

    const request = new Request(
      "http://localhost:3000/api/favorites/test-park",
      {
        method: "DELETE",
      },
    );

    const params = Promise.resolve({ parkId: "test-park" });

    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(data).toEqual({ error: "Not found" });
    expect(prisma.userFavorite.findUnique).toHaveBeenCalledWith({
      where: {
        userId_parkId: {
          userId: "user-123",
          parkId: "park-db-id",
        },
      },
    });
  });

  it("should successfully delete favorite when it exists", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    const mockPark = {
      id: "park-db-id",
      slug: "test-park",
      name: "Test Park",
    };

    const mockFavorite = {
      id: "fav-123",
      userId: "user-123",
      parkId: "park-db-id",
      createdAt: new Date(),
    };

    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.userFavorite.findUnique).mockResolvedValue(
      mockFavorite as any,
    );
    vi.mocked(prisma.userFavorite.delete).mockResolvedValue(
      mockFavorite as any,
    );

    const request = new Request(
      "http://localhost:3000/api/favorites/test-park",
      {
        method: "DELETE",
      },
    );

    const params = Promise.resolve({ parkId: "test-park" });

    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(prisma.userFavorite.delete).toHaveBeenCalledWith({
      where: { id: "fav-123" },
    });
  });

  it("should use slug to find park but database ID for favorite lookup", async () => {
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

    const mockFavorite = {
      id: "fav-456",
      userId: "user-123",
      parkId: "uuid-12345",
    };

    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.userFavorite.findUnique).mockResolvedValue(
      mockFavorite as any,
    );
    vi.mocked(prisma.userFavorite.delete).mockResolvedValue(
      mockFavorite as any,
    );

    const request = new Request("http://localhost:3000/api/favorites/my-park", {
      method: "DELETE",
    });

    const params = Promise.resolve({ parkId: "my-park" }); // Frontend sends slug

    // Act
    await DELETE(request, { params });

    // Assert
    // Should look up park by slug
    expect(prisma.park.findUnique).toHaveBeenCalledWith({
      where: { slug: "my-park" },
    });

    // But find favorite using database ID
    expect(prisma.userFavorite.findUnique).toHaveBeenCalledWith({
      where: {
        userId_parkId: {
          userId: "user-123",
          parkId: "uuid-12345", // Not 'my-park'
        },
      },
    });

    // And delete by favorite ID
    expect(prisma.userFavorite.delete).toHaveBeenCalledWith({
      where: { id: "fav-456" },
    });
  });

  it("should only delete favorite for authenticated user", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    const mockPark = {
      id: "park-db-id",
      slug: "test-park",
    };

    const mockFavorite = {
      id: "fav-123",
      userId: "user-123", // Same as authenticated user
      parkId: "park-db-id",
    };

    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.userFavorite.findUnique).mockResolvedValue(
      mockFavorite as any,
    );
    vi.mocked(prisma.userFavorite.delete).mockResolvedValue(
      mockFavorite as any,
    );

    const request = new Request(
      "http://localhost:3000/api/favorites/test-park",
      {
        method: "DELETE",
      },
    );

    const params = Promise.resolve({ parkId: "test-park" });

    // Act
    await DELETE(request, { params });

    // Assert
    // Should check that userId matches session
    expect(prisma.userFavorite.findUnique).toHaveBeenCalledWith({
      where: {
        userId_parkId: {
          userId: "user-123",
          parkId: "park-db-id",
        },
      },
    });
  });

  it("should handle different users attempting to delete same park", async () => {
    // Arrange - User A has favorited the park
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-B" }, // User B is authenticated
    } as any);

    const mockPark = {
      id: "park-db-id",
      slug: "test-park",
    };

    // User B's favorite doesn't exist
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(prisma.userFavorite.findUnique).mockResolvedValue(null);

    const request = new Request(
      "http://localhost:3000/api/favorites/test-park",
      {
        method: "DELETE",
      },
    );

    const params = Promise.resolve({ parkId: "test-park" });

    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(data).toEqual({ error: "Not found" });
    expect(prisma.userFavorite.delete).not.toHaveBeenCalled();
  });
});
