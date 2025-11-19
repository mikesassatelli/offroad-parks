import { POST } from "@/app/api/parks/submit/route";
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
      create: vi.fn(),
    },
  },
}));

describe("POST /api/parks/submit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const validParkData = {
    name: "Test Park",
    state: "CA",
    city: "Test City",
    latitude: 34.0522,
    longitude: -118.2437,
    website: "https://test.com",
    phone: "5551234567",
    dayPassUSD: 25,
    milesOfTrails: 50,
    acres: 1000,
    notes: "Great park",
    terrain: ["sand", "rocks"],
    difficulty: ["moderate"],
    amenities: ["restrooms"],
    
      camping: [],vehicleTypes: [],
  };

  it("should return 401 when user is not authenticated", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new Request("http://localhost:3000/api/parks/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validParkData),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("should return 401 when session has no user ID", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({ user: {} } as any);

    const request = new Request("http://localhost:3000/api/parks/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validParkData),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("should create park with PENDING status for regular users", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", role: "USER" },
    } as any);

    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);

    const mockCreatedPark = {
      id: "park-123",
      slug: "test-park",
      status: "PENDING",
      ...validParkData,
      terrain: validParkData.terrain.map((t) => ({ terrain: t })),
      difficulty: validParkData.difficulty.map((d) => ({ difficulty: d })),
      amenities: validParkData.amenities.map((a) => ({ amenity: a })),
    };

    vi.mocked(prisma.park.create).mockResolvedValue(mockCreatedPark as any);

    const request = new Request("http://localhost:3000/api/parks/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validParkData),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.park.status).toBe("PENDING");
    expect(prisma.park.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "PENDING",
          submitterId: "user-123",
        }),
      }),
    );
  });

  it("should create park with APPROVED status for admin users", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);

    const mockCreatedPark = {
      id: "park-123",
      slug: "test-park",
      status: "APPROVED",
      ...validParkData,
      terrain: validParkData.terrain.map((t) => ({ terrain: t })),
      difficulty: validParkData.difficulty.map((d) => ({ difficulty: d })),
      amenities: validParkData.amenities.map((a) => ({ amenity: a })),
    };

    vi.mocked(prisma.park.create).mockResolvedValue(mockCreatedPark as any);

    const request = new Request("http://localhost:3000/api/parks/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validParkData),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.park.status).toBe("APPROVED");
    expect(prisma.park.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "APPROVED",
          submitterId: "admin-123",
        }),
      }),
    );
  });

  it("should return 400 when name is missing", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    const invalidData = { ...validParkData, name: "" };

    const request = new Request("http://localhost:3000/api/parks/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidData),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Name and state are required" });
  });

  it("should return 400 when state is missing", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    const invalidData = { ...validParkData, state: "" };

    const request = new Request("http://localhost:3000/api/parks/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidData),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "Name and state are required" });
  });

  it("should return 400 when terrain is empty", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    const invalidData = { ...validParkData, terrain: [] };

    const request = new Request("http://localhost:3000/api/parks/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidData),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data).toEqual({ error: "At least one terrain type is required" });
  });

  it("should return 400 when difficulty is empty", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    const invalidData = { ...validParkData, difficulty: [] };

    const request = new Request("http://localhost:3000/api/parks/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(invalidData),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(400);
    expect(data).toEqual({
      error: "At least one difficulty level is required",
    });
  });

  it("should generate slug from park name when not provided", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.park.create).mockResolvedValue({} as any);

    const dataWithoutSlug = { ...validParkData };
    delete (dataWithoutSlug as any).slug;

    const request = new Request("http://localhost:3000/api/parks/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...dataWithoutSlug, name: "My Awesome Park!" }),
    });

    // Act
    await POST(request);

    // Assert
    expect(prisma.park.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "my-awesome-park",
        }),
      }),
    );
  });

  it("should handle slug generation edge cases", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.park.create).mockResolvedValue({} as any);

    const testCases = [
      { name: "Park & Trail System", expectedSlug: "park-trail-system" },
      { name: "   Spaced   Out   ", expectedSlug: "spaced-out" },
      { name: "Park123", expectedSlug: "park123" },
      { name: "A@#$B", expectedSlug: "a-b" },
    ];

    for (const { name, expectedSlug } of testCases) {
      vi.clearAllMocks();
      vi.mocked(auth).mockResolvedValue({ user: { id: "user-123" } } as any);
      vi.mocked(prisma.park.findUnique).mockResolvedValue(null);
      vi.mocked(prisma.park.create).mockResolvedValue({} as any);

      const request = new Request("http://localhost:3000/api/parks/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...validParkData, name }),
      });

      await POST(request);

      expect(prisma.park.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            slug: expectedSlug,
          }),
        }),
      );
    }
  });

  it("should add timestamp suffix when slug already exists", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    // Mock existing park with same slug
    vi.mocked(prisma.park.findUnique).mockResolvedValue({
      id: "existing-park",
      slug: "test-park",
    } as any);

    vi.mocked(prisma.park.create).mockResolvedValue({} as any);

    const request = new Request("http://localhost:3000/api/parks/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validParkData),
    });

    // Act
    await POST(request);

    // Assert
    expect(prisma.park.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: expect.stringMatching(/^test-park-\d+$/),
        }),
      }),
    );
  });

  it("should handle database errors gracefully", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    const dbError = new Error("Database connection failed");
    vi.mocked(prisma.park.findUnique).mockRejectedValue(dbError);

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const request = new Request("http://localhost:3000/api/parks/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validParkData),
    });

    // Act
    const response = await POST(request);
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to create park" });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Park submission error:",
      dbError,
    );

    consoleErrorSpy.mockRestore();
  });

  it("should create park with optional fields as null", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.park.create).mockResolvedValue({} as any);

    const minimalData = {
      name: "Minimal Park",
      state: "TX",
      terrain: ["sand"],
      difficulty: ["easy"],
      amenities: [],
      
      camping: [],vehicleTypes: [],
    };

    const request = new Request("http://localhost:3000/api/parks/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(minimalData),
    });

    // Act
    await POST(request);

    // Assert
    expect(prisma.park.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          city: null,
          latitude: null,
          longitude: null,
          website: null,
          phone: null,
          dayPassUSD: null,
          milesOfTrails: null,
          acres: null,
          notes: null,
        }),
      }),
    );
  });

  it("should include terrain, difficulty, and amenities in created park", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.park.create).mockResolvedValue({} as any);

    const request = new Request("http://localhost:3000/api/parks/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validParkData),
    });

    // Act
    await POST(request);

    // Assert
    expect(prisma.park.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          terrain: {
            create: [{ terrain: "sand" }, { terrain: "rocks" }],
          },
          difficulty: {
            create: [{ difficulty: "moderate" }],
          },
          amenities: {
            create: [{ amenity: "restrooms" }],
          },
          camping: {
            create: [],
          },
          vehicleTypes: {
            create: [],
          },
        }),
        include: {
          terrain: true,
          difficulty: true,
          amenities: true,
          camping: true,
          vehicleTypes: true,
        },
      }),
    );
  });

  it("should store submitterId from session", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "specific-user-id" },
    } as any);

    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.park.create).mockResolvedValue({} as any);

    const request = new Request("http://localhost:3000/api/parks/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validParkData),
    });

    // Act
    await POST(request);

    // Assert
    expect(prisma.park.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          submitterId: "specific-user-id",
        }),
      }),
    );
  });

  it("should use provided slug when explicitly provided", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);
    vi.mocked(prisma.park.create).mockResolvedValue({} as any);

    const dataWithSlug = {
      ...validParkData,
      slug: "custom-park-slug",
    };

    const request = new Request("http://localhost:3000/api/parks/submit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dataWithSlug),
    });

    // Act
    await POST(request);

    // Assert - Should use the provided slug, not generate one
    expect(prisma.park.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          slug: "custom-park-slug",
        }),
      }),
    );
  });
});
