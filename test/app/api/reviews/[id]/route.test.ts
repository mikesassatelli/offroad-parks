import { PUT, DELETE } from "@/app/api/reviews/[id]/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    parkReview: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    reviewHelpfulVote: {
      count: vi.fn(),
    },
    park: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

vi.mock("@/lib/review-utils", () => ({
  recalculateParkRatings: vi.fn(),
}));

vi.mock("@/lib/types", () => ({
  transformDbReview: vi.fn((review) => review),
}));

describe("PUT /api/reviews/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 for unauthenticated users", async () => {
    (auth as any).mockResolvedValue(null);

    const request = new Request("http://localhost/api/reviews/review-1", {
      method: "PUT",
      body: JSON.stringify({ body: "Updated review" }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: "review-1" }) });

    expect(response.status).toBe(401);
  });

  it("should return 404 if review not found", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.parkReview.findUnique as any).mockResolvedValue(null);

    const request = new Request("http://localhost/api/reviews/review-1", {
      method: "PUT",
      body: JSON.stringify({ body: "Updated review" }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: "review-1" }) });

    expect(response.status).toBe(404);
  });

  it("should return 403 if user does not own the review", async () => {
    const mockReview = { id: "review-1", userId: "user-2" };

    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.parkReview.findUnique as any).mockResolvedValue(mockReview);

    const request = new Request("http://localhost/api/reviews/review-1", {
      method: "PUT",
      body: JSON.stringify({ body: "Updated review" }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: "review-1" }) });

    expect(response.status).toBe(403);
  });

  it("should update review and set status to PENDING", async () => {
    const mockReview = {
      id: "review-1",
      userId: "user-1",
      parkId: "park-1",
    };
    const mockUpdatedReview = {
      ...mockReview,
      body: "Updated review",
      status: "PENDING",
      user: { id: "user-1", name: "Test User", image: null },
      _count: { helpfulVotes: 5 },
    };

    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.parkReview.findUnique as any).mockResolvedValue(mockReview);
    (prisma.parkReview.update as any).mockResolvedValue(mockUpdatedReview);

    const request = new Request("http://localhost/api/reviews/review-1", {
      method: "PUT",
      body: JSON.stringify({
        overallRating: 4,
        terrainRating: 4,
        facilitiesRating: 3,
        difficultyRating: 3,
        body: "Updated review",
      }),
    });
    const response = await PUT(request, { params: Promise.resolve({ id: "review-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.parkReview.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "review-1" },
        data: expect.objectContaining({
          status: "PENDING",
        }),
      })
    );
  });
});

describe("DELETE /api/reviews/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 for unauthenticated users", async () => {
    (auth as any).mockResolvedValue(null);

    const request = new Request("http://localhost/api/reviews/review-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: "review-1" }) });

    expect(response.status).toBe(401);
  });

  it("should return 404 if review not found", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.parkReview.findUnique as any).mockResolvedValue(null);

    const request = new Request("http://localhost/api/reviews/review-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: "review-1" }) });

    expect(response.status).toBe(404);
  });

  it("should return 403 if user does not own the review", async () => {
    const mockReview = { id: "review-1", userId: "user-2", parkId: "park-1" };

    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.parkReview.findUnique as any).mockResolvedValue(mockReview);

    const request = new Request("http://localhost/api/reviews/review-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: "review-1" }) });

    expect(response.status).toBe(403);
  });

  it("should delete review and recalculate park ratings", async () => {
    const mockReview = { id: "review-1", userId: "user-1", parkId: "park-1" };

    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.parkReview.findUnique as any).mockResolvedValue(mockReview);
    (prisma.parkReview.delete as any).mockResolvedValue({});

    const request = new Request("http://localhost/api/reviews/review-1", {
      method: "DELETE",
    });
    const response = await DELETE(request, { params: Promise.resolve({ id: "review-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(prisma.parkReview.delete).toHaveBeenCalledWith({
      where: { id: "review-1" },
    });
  });
});
