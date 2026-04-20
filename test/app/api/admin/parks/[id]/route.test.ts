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
      findUnique: vi.fn(),
    },
  },
}));

// Mock Next.js cache revalidation
vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

// OP-90: map-hero generation is fire-and-forget; stub so tests don't trigger
// real Mapbox / Blob calls.
vi.mock("@/lib/map-hero/generate", () => ({
  generateMapHeroAsync: vi.fn(),
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
    // Default stub for the pre-update coord read (OP-90). Individual tests
    // that care about coord-change detection override this.
    vi.mocked(prisma.park.findUnique).mockResolvedValue({
      latitude: null,
      longitude: null,
      address: null,
    } as any);
  });

  const validUpdateData = {
    name: "Updated Park",
    latitude: 34.0522,
    longitude: -118.2437,
    dayPassUSD: 30,
    milesOfTrails: 60,
    acres: 1200,
    terrain: ["sand", "rocks"],
    amenities: ["restrooms"],
    camping: [],
    vehicleTypes: [],
    address: {
      city: "Los Angeles",
      state: "CA",
    },
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

  it("should update park with terrain and amenities relations", async () => {
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
        terrain: {
          deleteMany: {},
          create: [{ terrain: "sand" }, { terrain: "rocks" }],
        },
        amenities: {
          deleteMany: {},
          create: [{ amenity: "restrooms" }],
        },
        camping: {
          deleteMany: {},
          create: [],
        },
        vehicleTypes: {
          deleteMany: {},
          create: [],
        },
        address: {
          upsert: {
            create: expect.objectContaining({
              city: "Los Angeles",
              state: "California",
            }),
            update: expect.objectContaining({
              city: "Los Angeles",
              state: "California",
            }),
          },
        },
      }),
      include: {
        terrain: true,
        amenities: true,
        camping: true,
        vehicleTypes: true,
        address: true,
      },
    });
  });

  it("should handle empty arrays for terrain and amenities", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    vi.mocked(prisma.park.update).mockResolvedValue({} as any);

    const dataWithEmptyArrays = {
      ...validUpdateData,
      terrain: [],
      amenities: [],
      camping: [],
      vehicleTypes: [],
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
          terrain: {
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

  it("returns 400 when address is provided without a state", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validUpdateData,
          address: { city: "Somewhere" }, // no state
        }),
      },
    );

    const params = Promise.resolve({ id: "park-123" });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "State is required on the address." });
    expect(prisma.park.update).not.toHaveBeenCalled();
  });

  it("returns 400 when address.state is not a recognized US state", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validUpdateData,
          address: { ...validUpdateData.address, state: "Narnia" },
        }),
      },
    );

    const params = Promise.resolve({ id: "park-123" });
    const response = await PATCH(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain(`Invalid state: "Narnia"`);
    expect(prisma.park.update).not.toHaveBeenCalled();
  });

  it("normalizes a full state name with mixed casing when updating", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);
    vi.mocked(prisma.park.update).mockResolvedValue({
      id: "park-123",
      slug: "p",
    } as any);

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...validUpdateData,
          address: { ...validUpdateData.address, state: "new mexico" },
        }),
      },
    );

    const params = Promise.resolve({ id: "park-123" });
    await PATCH(request, { params });

    const updateCall = vi.mocked(prisma.park.update).mock.calls[0][0] as any;
    expect(updateCall.data.address.upsert.create.state).toBe("New Mexico");
    expect(updateCall.data.address.upsert.update.state).toBe("New Mexico");
  });

  it("regenerates map hero when coordinates change", async () => {
    const { generateMapHeroAsync } = await import("@/lib/map-hero/generate");
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    // Existing park has different coords
    vi.mocked(prisma.park.findUnique).mockResolvedValue({
      latitude: 10,
      longitude: 20,
      address: { latitude: 10, longitude: 20 },
    } as any);

    vi.mocked(prisma.park.update).mockResolvedValue({
      id: "park-123",
      slug: "updated",
    } as any);

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validUpdateData), // 34.0522 / -118.2437
      },
    );

    await PATCH(request, { params: Promise.resolve({ id: "park-123" }) });

    expect(generateMapHeroAsync).toHaveBeenCalledWith("park-123", "admin-edit");
  });

  it("does NOT regenerate map hero when coordinates are unchanged", async () => {
    const { generateMapHeroAsync } = await import("@/lib/map-hero/generate");
    vi.mocked(generateMapHeroAsync).mockClear();

    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    // Existing coords match payload
    vi.mocked(prisma.park.findUnique).mockResolvedValue({
      latitude: 34.0522,
      longitude: -118.2437,
      address: null,
    } as any);

    vi.mocked(prisma.park.update).mockResolvedValue({
      id: "park-123",
      slug: "updated",
    } as any);

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(validUpdateData),
      },
    );

    await PATCH(request, { params: Promise.resolve({ id: "park-123" }) });

    expect(generateMapHeroAsync).not.toHaveBeenCalled();
  });

  it("strips flat address fields from the park update payload", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);
    vi.mocked(prisma.park.update).mockResolvedValue({
      id: "park-123",
      slug: "updated",
    } as any);

    const bodyWithFlatFields = {
      ...validUpdateData,
      // Flat address fields that should be stripped from the Park update
      streetAddress: "123 Elm",
      streetAddress2: "Suite 2",
      addressCity: "Elsewhere",
      addressState: "CA",
      zipCode: "12345",
      county: "Some County",
    };

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123",
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bodyWithFlatFields),
      },
    );

    await PATCH(request, { params: Promise.resolve({ id: "park-123" }) });

    const updateCall = vi.mocked(prisma.park.update).mock.calls[0][0] as any;
    expect(updateCall.data).not.toHaveProperty("streetAddress");
    expect(updateCall.data).not.toHaveProperty("streetAddress2");
    expect(updateCall.data).not.toHaveProperty("addressCity");
    expect(updateCall.data).not.toHaveProperty("addressState");
    expect(updateCall.data).not.toHaveProperty("zipCode");
    expect(updateCall.data).not.toHaveProperty("county");
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
      amenities: [],
      camping: [],
      vehicleTypes: [],
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
