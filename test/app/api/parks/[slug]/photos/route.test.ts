import { POST } from "@/app/api/parks/[slug]/photos/route";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { put } from "@vercel/blob";
import { vi } from "vitest";

// Mock dependencies
vi.mock("@/lib/auth", () => ({
  auth: vi.fn(() => Promise.resolve(null)),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findUnique: vi.fn(),
    },
    parkPhoto: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@vercel/blob", () => ({
  put: vi.fn(),
}));

describe("POST /api/parks/[slug]/photos", () => {
  const mockPark = {
    id: "park-123",
    slug: "test-park",
    name: "Test Park",
  };

  const mockBlob = {
    url: "https://blob.vercel-storage.com/test-photo.jpg",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 when not authenticated", async () => {
    vi.mocked(auth).mockResolvedValue(null as any);

    const request = new Request("http://localhost/api/parks/test-park/photos", {
      method: "POST",
    });
    const params = Promise.resolve({ slug: "test-park" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe("Unauthorized");
  });

  it("should return 404 when park not found", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", name: "Test User" },
    } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(null);

    const request = new Request(
      "http://localhost/api/parks/invalid-park/photos",
      {
        method: "POST",
      },
    );
    const params = Promise.resolve({ slug: "invalid-park" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe("Park not found");
  });

  it("should return 400 when no file provided", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);

    const formData = new FormData();
    const request = new Request("http://localhost/api/parks/test-park/photos", {
      method: "POST",
      body: formData,
    });
    const params = Promise.resolve({ slug: "test-park" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe("No file provided");
  });

  it("should return 400 for invalid file type", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);

    const file = new File(["content"], "test.pdf", { type: "application/pdf" });
    const formData = new FormData();
    formData.append("file", file);

    const request = new Request("http://localhost/api/parks/test-park/photos", {
      method: "POST",
      body: formData,
    });
    const params = Promise.resolve({ slug: "test-park" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("Invalid file type");
  });

  it("should return 400 when file is too large", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1" },
    } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);

    // Create a file larger than 5MB
    const largeContent = new ArrayBuffer(6 * 1024 * 1024); // 6MB
    const file = new File([largeContent], "large.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", file);

    const request = new Request("http://localhost/api/parks/test-park/photos", {
      method: "POST",
      body: formData,
    });
    const params = Promise.resolve({ slug: "test-park" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("File too large");
  });

  it("should upload photo and set status to PENDING for regular user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "user-1", role: "USER" },
    } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(put).mockResolvedValue(mockBlob as any);
    vi.mocked(prisma.parkPhoto.create).mockResolvedValue({
      id: "photo-1",
      url: mockBlob.url,
      caption: "Test caption",
      status: "PENDING",
      user: { name: "Test User", email: "test@example.com" },
    } as any);

    const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", file);
    formData.append("caption", "Test caption");

    const request = new Request("http://localhost/api/parks/test-park/photos", {
      method: "POST",
      body: formData,
    });
    const params = Promise.resolve({ slug: "test-park" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Photo uploaded and pending approval");
    expect(put).toHaveBeenCalled();
    expect(prisma.parkPhoto.create).toHaveBeenCalledWith({
      data: {
        parkId: "park-123",
        userId: "user-1",
        url: mockBlob.url,
        caption: "Test caption",
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            name: true,
            email: true,
          },
        },
      },
    });
  });

  it("should upload photo and auto-approve for admin user", async () => {
    vi.mocked(auth).mockResolvedValue({
      user: { id: "admin-1", role: "ADMIN" },
    } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(put).mockResolvedValue(mockBlob as any);
    vi.mocked(prisma.parkPhoto.create).mockResolvedValue({
      id: "photo-1",
      url: mockBlob.url,
      caption: null,
      status: "APPROVED",
      user: { name: "Admin User", email: "admin@example.com" },
    } as any);

    const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", file);

    const request = new Request("http://localhost/api/parks/test-park/photos", {
      method: "POST",
      body: formData,
    });
    const params = Promise.resolve({ slug: "test-park" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.message).toBe("Photo uploaded successfully");
    expect(prisma.parkPhoto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "APPROVED",
        }),
      }),
    );
  });

  it("should accept JPEG file type", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(put).mockResolvedValue(mockBlob as any);
    vi.mocked(prisma.parkPhoto.create).mockResolvedValue({
      id: "photo-1",
    } as any);

    const file = new File(["content"], "test.jpeg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", file);

    const request = new Request("http://localhost/api/parks/test-park/photos", {
      method: "POST",
      body: formData,
    });
    const params = Promise.resolve({ slug: "test-park" });

    const response = await POST(request, { params });
    expect(response.status).toBe(200);
  });

  it("should accept PNG file type", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(put).mockResolvedValue(mockBlob as any);
    vi.mocked(prisma.parkPhoto.create).mockResolvedValue({
      id: "photo-1",
    } as any);

    const file = new File(["content"], "test.png", { type: "image/png" });
    const formData = new FormData();
    formData.append("file", file);

    const request = new Request("http://localhost/api/parks/test-park/photos", {
      method: "POST",
      body: formData,
    });
    const params = Promise.resolve({ slug: "test-park" });

    const response = await POST(request, { params });
    expect(response.status).toBe(200);
  });

  it("should accept WebP file type", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(put).mockResolvedValue(mockBlob as any);
    vi.mocked(prisma.parkPhoto.create).mockResolvedValue({
      id: "photo-1",
    } as any);

    const file = new File(["content"], "test.webp", { type: "image/webp" });
    const formData = new FormData();
    formData.append("file", file);

    const request = new Request("http://localhost/api/parks/test-park/photos", {
      method: "POST",
      body: formData,
    });
    const params = Promise.resolve({ slug: "test-park" });

    const response = await POST(request, { params });
    expect(response.status).toBe(200);
  });

  it("should handle upload errors gracefully", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(put).mockRejectedValue(new Error("Upload failed"));

    const consoleErrorSpy = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});

    const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", file);

    const request = new Request("http://localhost/api/parks/test-park/photos", {
      method: "POST",
      body: formData,
    });
    const params = Promise.resolve({ slug: "test-park" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.error).toBe("Failed to upload photo");
    expect(consoleErrorSpy).toHaveBeenCalled();

    consoleErrorSpy.mockRestore();
  });

  it("should upload photo without caption", async () => {
    vi.mocked(auth).mockResolvedValue({ user: { id: "user-1" } } as any);
    vi.mocked(prisma.park.findUnique).mockResolvedValue(mockPark as any);
    vi.mocked(put).mockResolvedValue(mockBlob as any);
    vi.mocked(prisma.parkPhoto.create).mockResolvedValue({
      id: "photo-1",
      caption: null,
    } as any);

    const file = new File(["content"], "test.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("file", file);

    const request = new Request("http://localhost/api/parks/test-park/photos", {
      method: "POST",
      body: formData,
    });
    const params = Promise.resolve({ slug: "test-park" });

    const response = await POST(request, { params });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(prisma.parkPhoto.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          caption: null,
        }),
      }),
    );
  });
});
