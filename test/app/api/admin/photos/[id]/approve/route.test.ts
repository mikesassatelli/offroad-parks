import { POST } from "@/app/api/admin/photos/[id]/approve/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { vi } from "vitest";

// Mock auth and Prisma
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    parkPhoto: {
      update: vi.fn(),
    },
  },
}));

describe("POST /api/admin/photos/[id]/approve", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when user is not authenticated", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new Request(
      "http://localhost:3000/api/admin/photos/photo-123/approve",
      {
        method: "POST",
      },
    );
    const params = Promise.resolve({ id: "photo-123" });

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
      "http://localhost:3000/api/admin/photos/photo-123/approve",
      {
        method: "POST",
      },
    );
    const params = Promise.resolve({ id: "photo-123" });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(403);
    expect(data).toEqual({ error: "Admin access required" });
  });

  it("should approve photo when user is admin", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    const mockApprovedPhoto = {
      id: "photo-123",
      status: "APPROVED",
      url: "https://example.com/photo.jpg",
      caption: "Test photo",
      park: {
        name: "Test Park",
        slug: "test-park",
      },
      user: {
        name: "John Doe",
        email: "john@example.com",
      },
    };

    vi.mocked(prisma.parkPhoto.update).mockResolvedValue(
      mockApprovedPhoto as any,
    );

    const request = new Request(
      "http://localhost:3000/api/admin/photos/photo-123/approve",
      {
        method: "POST",
      },
    );
    const params = Promise.resolve({ id: "photo-123" });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.photo.status).toBe("APPROVED");
    expect(prisma.parkPhoto.update).toHaveBeenCalledWith({
      where: { id: "photo-123" },
      data: { status: "APPROVED" },
      include: {
        park: {
          select: {
            name: true,
            slug: true,
          },
        },
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  });

  it("should include park and user info in response", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    const mockPhoto = {
      id: "photo-123",
      status: "APPROVED",
      park: {
        name: "Beautiful Park",
        slug: "beautiful-park",
      },
      user: {
        name: "Jane Smith",
        email: "jane@example.com",
      },
    };

    vi.mocked(prisma.parkPhoto.update).mockResolvedValue(mockPhoto as any);

    const request = new Request(
      "http://localhost:3000/api/admin/photos/photo-123/approve",
      {
        method: "POST",
      },
    );
    const params = Promise.resolve({ id: "photo-123" });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(data.photo.park).toEqual({
      name: "Beautiful Park",
      slug: "beautiful-park",
    });
    expect(data.photo.user).toEqual({
      name: "Jane Smith",
      email: "jane@example.com",
    });
  });

  it("should handle database errors gracefully", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    const dbError = new Error("Database connection failed");
    vi.mocked(prisma.parkPhoto.update).mockRejectedValue(dbError);

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const request = new Request(
      "http://localhost:3000/api/admin/photos/photo-123/approve",
      {
        method: "POST",
      },
    );
    const params = Promise.resolve({ id: "photo-123" });

    // Act
    const response = await POST(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to approve photo" });
    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Failed to approve photo:",
      dbError,
    );

    consoleErrorSpy.mockRestore();
  });

  it("should update photo status from PENDING to APPROVED", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    vi.mocked(prisma.parkPhoto.update).mockResolvedValue({
      id: "photo-123",
      status: "APPROVED",
    } as any);

    const request = new Request(
      "http://localhost:3000/api/admin/photos/photo-123/approve",
      {
        method: "POST",
      },
    );
    const params = Promise.resolve({ id: "photo-123" });

    // Act
    await POST(request, { params });

    // Assert
    expect(prisma.parkPhoto.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "photo-123" },
        data: { status: "APPROVED" },
      }),
    );
  });
});
