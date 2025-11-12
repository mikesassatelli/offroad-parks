import { DELETE, PATCH } from "@/app/api/admin/parks/[id]/route";
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
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock Next.js cache revalidation
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("DELETE /api/admin/parks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when user is not authenticated", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "DELETE",
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("should return 403 when user is not an admin", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", role: "USER" },
    } as any);

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "DELETE",
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(403);
    expect(data).toEqual({ error: "Forbidden" });
  });

  it("should successfully delete park when user is admin", async () => {
    // Arrange
    const { revalidatePath } = await import("next/cache");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    vi.mocked(prisma.park.delete).mockResolvedValue({
      slug: "test-park",
    } as any);

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "DELETE",
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(prisma.park.delete).toHaveBeenCalledWith({
      where: { id: "park-123" },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/parks/test-park");
  });

  it("should handle database errors gracefully", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    const dbError = new Error("Database connection failed");
    vi.mocked(prisma.park.delete).mockRejectedValue(dbError);

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "DELETE",
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to delete park" });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error deleting park:",
      dbError,
    );

    consoleErrorSpy.mockRestore();
  });
});

describe("PATCH /api/admin/parks/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validUpdateData = {
    name: "Updated Park",
    state: "CA",
    city: "Los Angeles",
    latitude: 34.0522,
    longitude: -118.2437,
    dayPassUSD: 30,
    milesOfTrails: 60,
    acres: 1200,
    terrain: ["sand", "rocks"],
    difficulty: ["moderate"],
    amenities: ["camping", "restrooms"],
  };

  it("should return 401 when user is not authenticated", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validUpdateData),
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    const response = await PATCH(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("should return 403 when user is not an admin", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", role: "USER" },
    } as any);

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validUpdateData),
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    const response = await PATCH(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(403);
    expect(data).toEqual({ error: "Forbidden" });
  });

  it("should successfully update park when user is admin", async () => {
    // Arrange
    const { revalidatePath } = await import("next/cache");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    const mockUpdatedPark = {
      id: "park-123",
      ...validUpdateData,
      terrain: validUpdateData.terrain.map((t) => ({ terrain: t })),
      difficulty: validUpdateData.difficulty.map((d) => ({ difficulty: d })),
      amenities: validUpdateData.amenities.map((a) => ({ amenity: a })),
      slug: "updated-park",
      status: "APPROVED",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.park.update).mockResolvedValue(mockUpdatedPark as any);

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validUpdateData),
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    const response = await PATCH(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.park.name).toBe("Updated Park");
    expect(revalidatePath).toHaveBeenCalledWith("/");
    expect(revalidatePath).toHaveBeenCalledWith("/parks/updated-park");
  });

  it("should update park with terrain, difficulty, and amenities relations", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    vi.mocked(prisma.park.update).mockResolvedValue({} as any);

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validUpdateData),
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    await PATCH(request, { params });

    // Assert
    expect(prisma.park.update).toHaveBeenCalledWith({
      where: { id: "park-123" },
      data: expect.objectContaining({
        name: "Updated Park",
        state: "CA",
        terrain: {
          deleteMany: {},
          create: [{ terrain: "sand" }, { terrain: "rocks" }],
        },
        difficulty: {
          deleteMany: {},
          create: [{ difficulty: "moderate" }],
        },
        amenities: {
          deleteMany: {},
          create: [{ amenity: "camping" }, { amenity: "restrooms" }],
        },
      }),
      include: {
        terrain: true,
        difficulty: true,
        amenities: true,
      },
    });
  });

  it("should handle empty arrays for terrain, difficulty, and amenities", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    vi.mocked(prisma.park.update).mockResolvedValue({} as any);

    const dataWithEmptyArrays = {
      ...validUpdateData,
      terrain: [],
      difficulty: [],
      amenities: [],
    };

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataWithEmptyArrays),
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    await PATCH(request, { params });

    // Assert
    expect(prisma.park.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          terrain: {
            deleteMany: {},
            create: [],
          },
          difficulty: {
            deleteMany: {},
            create: [],
          },
          amenities: {
            deleteMany: {},
            create: [],
          },
        }),
      }),
    );
  });

  it("should handle missing relation fields", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    vi.mocked(prisma.park.update).mockResolvedValue({} as any);

    const dataWithoutRelations = {
      name: "Updated Park",
      state: "CA",
    };

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(dataWithoutRelations),
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    await PATCH(request, { params });

    // Assert
    expect(prisma.park.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "Updated Park",
          state: "CA",
          terrain: {
            deleteMany: {},
            create: [],
          },
          difficulty: {
            deleteMany: {},
            create: [],
          },
          amenities: {
            deleteMany: {},
            create: [],
          },
        }),
      }),
    );
  });

  it("should delete existing relations before creating new ones", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    vi.mocked(prisma.park.update).mockResolvedValue({} as any);

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validUpdateData),
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    await PATCH(request, { params });

    // Assert
    const updateCall = vi.mocked(prisma.park.update).mock.calls[0][0];
    expect(updateCall.data.terrain).toEqual({
      deleteMany: {},
      create: [{ terrain: "sand" }, { terrain: "rocks" }],
    });
  });

  it("should handle database errors gracefully", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    const dbError = new Error("Database connection failed");
    vi.mocked(prisma.park.update).mockRejectedValue(dbError);

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validUpdateData),
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    const response = await PATCH(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to update park" });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error updating park:",
      dbError,
    );

    consoleErrorSpy.mockRestore();
  });

  it("should preserve other park fields not in update data", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    vi.mocked(prisma.park.update).mockResolvedValue({} as any);

    const partialUpdate = {
      name: "New Name Only",
      terrain: ["sand"],
      difficulty: ["easy"],
      amenities: [],
    };

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partialUpdate),
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    await PATCH(request, { params });

    // Assert
    expect(prisma.park.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          name: "New Name Only",
        }),
      }),
    );
  });
});
