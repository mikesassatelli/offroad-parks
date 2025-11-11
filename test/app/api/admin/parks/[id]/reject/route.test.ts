import { POST } from "@/app/api/admin/parks/[id]/reject/route";
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
      update: vi.fn(),
    },
  },
}));

describe("POST /api/admin/parks/[id]/reject", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when user is not authenticated", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123/reject",
      {
        method: "POST",
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    const response = await POST(request, { params });
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
      "http://localhost:3000/api/admin/parks/park-123/reject",
      {
        method: "POST",
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(403);
    expect(data).toEqual({ error: "Forbidden" });
  });

  it("should reject park when user is admin", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    const mockRejectedPark = {
      id: "park-123",
      name: "Test Park",
      slug: "test-park",
      status: "REJECTED",
      state: "CA",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    vi.mocked(prisma.park.update).mockResolvedValue(mockRejectedPark as any);

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123/reject",
      {
        method: "POST",
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.park.status).toBe("REJECTED");
    expect(prisma.park.update).toHaveBeenCalledWith({
      where: { id: "park-123" },
      data: { status: "REJECTED" },
    });
  });

  it("should update park status from PENDING to REJECTED", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    const mockPark = {
      id: "park-123",
      status: "REJECTED",
    };

    vi.mocked(prisma.park.update).mockResolvedValue(mockPark as any);

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123/reject",
      {
        method: "POST",
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    await POST(request, { params });

    // Assert
    expect(prisma.park.update).toHaveBeenCalledWith({
      where: { id: "park-123" },
      data: { status: "REJECTED" },
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
      "http://localhost:3000/api/admin/parks/park-123/reject",
      {
        method: "POST",
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to reject park" });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error rejecting park:",
      dbError,
    );

    consoleErrorSpy.mockRestore();
  });

  it("should return updated park in response", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    const mockPark = {
      id: "park-123",
      name: "Test Park",
      slug: "test-park",
      status: "REJECTED",
      state: "CA",
    };

    vi.mocked(prisma.park.update).mockResolvedValue(mockPark as any);

    const request = new Request(
      "http://localhost:3000/api/admin/parks/park-123/reject",
      {
        method: "POST",
      },
    );

    const params = Promise.resolve({ id: "park-123" });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(data.park).toBeDefined();
    expect(data.park.id).toBe("park-123");
    expect(data.park.status).toBe("REJECTED");
  });
});
