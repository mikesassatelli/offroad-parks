import { POST } from "@/app/api/reviews/[id]/helpful/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    parkReview: {
      findUnique: vi.fn(),
    },
    reviewHelpfulVote: {
      findUnique: vi.fn(),
      create: vi.fn(),
      delete: vi.fn(),
      count: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("POST /api/reviews/[id]/helpful", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 for unauthenticated users", async () => {
    (auth as any).mockResolvedValue(null);

    const request = new Request("http://localhost/api/reviews/review-1/helpful", {
      method: "POST",
    });
    const response = await POST(request, { params: Promise.resolve({ id: "review-1" }) });

    expect(response.status).toBe(401);
  });

  it("should return 404 if review not found", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.parkReview.findUnique as any).mockResolvedValue(null);

    const request = new Request("http://localhost/api/reviews/review-1/helpful", {
      method: "POST",
    });
    const response = await POST(request, { params: Promise.resolve({ id: "review-1" }) });

    expect(response.status).toBe(404);
  });

  it("should return 400 if user tries to vote on their own review", async () => {
    const mockReview = { id: "review-1", userId: "user-1" };

    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.parkReview.findUnique as any).mockResolvedValue(mockReview);

    const request = new Request("http://localhost/api/reviews/review-1/helpful", {
      method: "POST",
    });
    const response = await POST(request, { params: Promise.resolve({ id: "review-1" }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("own review");
  });

  it("should add a vote if user has not voted", async () => {
    const mockReview = { id: "review-1", userId: "user-2" };

    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.parkReview.findUnique as any).mockResolvedValue(mockReview);
    (prisma.reviewHelpfulVote.findUnique as any).mockResolvedValue(null);
    (prisma.reviewHelpfulVote.create as any).mockResolvedValue({ id: "vote-1" });
    (prisma.reviewHelpfulVote.count as any).mockResolvedValue(5);

    const request = new Request("http://localhost/api/reviews/review-1/helpful", {
      method: "POST",
    });
    const response = await POST(request, { params: Promise.resolve({ id: "review-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.hasVoted).toBe(true);
    expect(data.helpfulCount).toBe(5);
    expect(prisma.reviewHelpfulVote.create).toHaveBeenCalledWith({
      data: {
        userId: "user-1",
        reviewId: "review-1",
      },
    });
  });

  it("should remove a vote if user has already voted (toggle)", async () => {
    const mockReview = { id: "review-1", userId: "user-2" };
    const mockExistingVote = { id: "vote-1" };

    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.parkReview.findUnique as any).mockResolvedValue(mockReview);
    (prisma.reviewHelpfulVote.findUnique as any).mockResolvedValue(mockExistingVote);
    (prisma.reviewHelpfulVote.delete as any).mockResolvedValue({});
    (prisma.reviewHelpfulVote.count as any).mockResolvedValue(3);

    const request = new Request("http://localhost/api/reviews/review-1/helpful", {
      method: "POST",
    });
    const response = await POST(request, { params: Promise.resolve({ id: "review-1" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.hasVoted).toBe(false);
    expect(data.helpfulCount).toBe(3);
    expect(prisma.reviewHelpfulVote.delete).toHaveBeenCalledWith({
      where: { id: "vote-1" },
    });
  });
});
