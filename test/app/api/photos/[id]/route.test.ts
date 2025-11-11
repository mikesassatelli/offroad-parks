import { DELETE } from "@/app/api/photos/[id]/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { del } from "@vercel/blob";
import { vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    parkPhoto: {
      findUnique: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@vercel/blob", () => ({
  del: vi.fn(),
}));

describe("DELETE /api/photos/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when user is not authenticated", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue(null);

    const request = new Request("http://localhost:3000/api/photos/photo-123", {
      method: "DELETE",
    });
    const params = Promise.resolve({ id: "photo-123" });

    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(401);
    expect(data).toEqual({ error: "Unauthorized" });
  });

  it("should return 404 when photo does not exist", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123" },
    } as any);

    vi.mocked(prisma.parkPhoto.findUnique).mockResolvedValue(null);

    const request = new Request(
      "http://localhost:3000/api/photos/non-existent",
      {
        method: "DELETE",
      },
    );
    const params = Promise.resolve({ id: "non-existent" });

    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(404);
    expect(data).toEqual({ error: "Photo not found" });
  });

  it("should return 403 when user is not owner or admin", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", role: "USER" },
    } as any);

    const mockPhoto = {
      id: "photo-123",
      url: "https://blob.vercel-storage.com/photo.jpg",
      userId: "other-user-456", // Different user
      parkId: "park-123",
      caption: "Test photo",
      createdAt: new Date(),
    };

    vi.mocked(prisma.parkPhoto.findUnique).mockResolvedValue(mockPhoto as any);

    const request = new Request("http://localhost:3000/api/photos/photo-123", {
      method: "DELETE",
    });
    const params = Promise.resolve({ id: "photo-123" });

    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(403);
    expect(data).toEqual({
      error: "You don't have permission to delete this photo",
    });
  });

  it("should allow owner to delete their photo", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", role: "USER" },
    } as any);

    const mockPhoto = {
      id: "photo-123",
      url: "https://blob.vercel-storage.com/photo.jpg",
      userId: "user-123", // Same as authenticated user
      parkId: "park-123",
      caption: "Test photo",
      createdAt: new Date(),
    };

    vi.mocked(prisma.parkPhoto.findUnique).mockResolvedValue(mockPhoto as any);
    vi.mocked(del).mockResolvedValue(undefined);
    vi.mocked(prisma.parkPhoto.delete).mockResolvedValue(mockPhoto as any);

    const request = new Request("http://localhost:3000/api/photos/photo-123", {
      method: "DELETE",
    });
    const params = Promise.resolve({ id: "photo-123" });

    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(del).toHaveBeenCalledWith(
      "https://blob.vercel-storage.com/photo.jpg",
    );
    expect(prisma.parkPhoto.delete).toHaveBeenCalledWith({
      where: { id: "photo-123" },
    });
  });

  it("should allow admin to delete any photo", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    const mockPhoto = {
      id: "photo-123",
      url: "https://blob.vercel-storage.com/photo.jpg",
      userId: "other-user-456", // Different user
      parkId: "park-123",
      caption: "Test photo",
      createdAt: new Date(),
    };

    vi.mocked(prisma.parkPhoto.findUnique).mockResolvedValue(mockPhoto as any);
    vi.mocked(del).mockResolvedValue(undefined);
    vi.mocked(prisma.parkPhoto.delete).mockResolvedValue(mockPhoto as any);

    const request = new Request("http://localhost:3000/api/photos/photo-123", {
      method: "DELETE",
    });
    const params = Promise.resolve({ id: "photo-123" });

    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(200);
    expect(data).toEqual({ success: true });
    expect(del).toHaveBeenCalledWith(
      "https://blob.vercel-storage.com/photo.jpg",
    );
    expect(prisma.parkPhoto.delete).toHaveBeenCalledWith({
      where: { id: "photo-123" },
    });
  });

  it("should delete photo from Vercel Blob before database", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", role: "ADMIN" },
    } as any);

    const mockPhoto = {
      id: "photo-123",
      url: "https://blob.vercel-storage.com/photo.jpg",
      userId: "user-123",
      parkId: "park-123",
      caption: "Test photo",
      createdAt: new Date(),
    };

    vi.mocked(prisma.parkPhoto.findUnique).mockResolvedValue(mockPhoto as any);
    vi.mocked(del).mockResolvedValue(undefined);
    vi.mocked(prisma.parkPhoto.delete).mockResolvedValue(mockPhoto as any);

    const request = new Request("http://localhost:3000/api/photos/photo-123", {
      method: "DELETE",
    });
    const params = Promise.resolve({ id: "photo-123" });

    // Act
    await DELETE(request, { params });

    // Assert - verify order of operations
    const delCallOrder = vi.mocked(del).mock.invocationCallOrder[0];
    const deleteCallOrder = vi.mocked(prisma.parkPhoto.delete).mock
      .invocationCallOrder[0];
    expect(delCallOrder).toBeLessThan(deleteCallOrder);
  });

  it("should handle Vercel Blob deletion errors", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", role: "ADMIN" },
    } as any);

    const mockPhoto = {
      id: "photo-123",
      url: "https://blob.vercel-storage.com/photo.jpg",
      userId: "user-123",
      parkId: "park-123",
      caption: "Test photo",
      createdAt: new Date(),
    };

    vi.mocked(prisma.parkPhoto.findUnique).mockResolvedValue(mockPhoto as any);
    vi.mocked(del).mockRejectedValue(new Error("Blob deletion failed"));

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const request = new Request("http://localhost:3000/api/photos/photo-123", {
      method: "DELETE",
    });
    const params = Promise.resolve({ id: "photo-123" });

    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to delete photo" });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should handle database deletion errors", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", role: "ADMIN" },
    } as any);

    const mockPhoto = {
      id: "photo-123",
      url: "https://blob.vercel-storage.com/photo.jpg",
      userId: "user-123",
      parkId: "park-123",
      caption: "Test photo",
      createdAt: new Date(),
    };

    vi.mocked(prisma.parkPhoto.findUnique).mockResolvedValue(mockPhoto as any);
    vi.mocked(del).mockResolvedValue(undefined);
    vi.mocked(prisma.parkPhoto.delete).mockRejectedValue(
      new Error("Database error"),
    );

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const request = new Request("http://localhost:3000/api/photos/photo-123", {
      method: "DELETE",
    });
    const params = Promise.resolve({ id: "photo-123" });

    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();

    // Assert
    expect(response.status).toBe(500);
    expect(data).toEqual({ error: "Failed to delete photo" });
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should check both isAdmin and isOwner conditions", async () => {
    // Arrange - Test with regular user who is the owner
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", role: "USER" },
    } as any);

    const mockPhoto = {
      id: "photo-123",
      url: "https://blob.vercel-storage.com/photo.jpg",
      userId: "user-123",
      parkId: "park-123",
      caption: "Test photo",
      createdAt: new Date(),
    };

    vi.mocked(prisma.parkPhoto.findUnique).mockResolvedValue(mockPhoto as any);
    vi.mocked(del).mockResolvedValue(undefined);
    vi.mocked(prisma.parkPhoto.delete).mockResolvedValue(mockPhoto as any);

    const request = new Request("http://localhost:3000/api/photos/photo-123", {
      method: "DELETE",
    });
    const params = Promise.resolve({ id: "photo-123" });

    // Act
    const response = await DELETE(request, { params });

    // Assert - User is not admin but is owner, so should succeed
    expect(response.status).toBe(200);
  });

  it("should handle photo without userId (orphaned photo)", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-123", role: "USER" },
    } as any);

    const mockPhoto = {
      id: "photo-123",
      url: "https://blob.vercel-storage.com/photo.jpg",
      userId: null, // Orphaned photo
      parkId: "park-123",
      caption: "Test photo",
      createdAt: new Date(),
    };

    vi.mocked(prisma.parkPhoto.findUnique).mockResolvedValue(mockPhoto as any);

    const request = new Request("http://localhost:3000/api/photos/photo-123", {
      method: "DELETE",
    });
    const params = Promise.resolve({ id: "photo-123" });

    // Act
    const response = await DELETE(request, { params });
    const data = await response.json();

    // Assert - Regular user cannot delete orphaned photo
    expect(response.status).toBe(403);
    expect(data).toEqual({
      error: "You don't have permission to delete this photo",
    });
  });

  it("should allow admin to delete orphaned photo", async () => {
    // Arrange
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-123", role: "ADMIN" },
    } as any);

    const mockPhoto = {
      id: "photo-123",
      url: "https://blob.vercel-storage.com/photo.jpg",
      userId: null, // Orphaned photo
      parkId: "park-123",
      caption: "Test photo",
      createdAt: new Date(),
    };

    vi.mocked(prisma.parkPhoto.findUnique).mockResolvedValue(mockPhoto as any);
    vi.mocked(del).mockResolvedValue(undefined);
    vi.mocked(prisma.parkPhoto.delete).mockResolvedValue(mockPhoto as any);

    const request = new Request("http://localhost:3000/api/photos/photo-123", {
      method: "DELETE",
    });
    const params = Promise.resolve({ id: "photo-123" });

    // Act
    const response = await DELETE(request, { params });

    // Assert - Admin can delete orphaned photos
    expect(response.status).toBe(200);
  });
});
