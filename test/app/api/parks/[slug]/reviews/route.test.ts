import { NextRequest } from "next/server";
import { GET, POST } from "@/app/api/parks/[slug]/reviews/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { vi, describe, it, expect, beforeEach } from "vitest";

// Mock dependencies
vi.mock("@/lib/prisma", () => ({
  prisma: {
    park: {
      findUnique: vi.fn(),
    },
    parkReview: {
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

describe("GET /api/parks/[slug]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 404 if park not found", async () => {
    (prisma.park.findUnique as any).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/parks/test-park/reviews");
    const response = await GET(request, { params: Promise.resolve({ slug: "test-park" }) });

    expect(response.status).toBe(404);
  });

  it("should return paginated reviews for a park", async () => {
    const mockPark = { id: "park-123", slug: "test-park" };
    const mockReviews = [
      {
        id: "review-1",
        parkId: "park-123",
        userId: "user-1",
        overallRating: 5,
        terrainRating: 4,
        facilitiesRating: 4,
        difficultyRating: 3,
        title: "Great park",
        body: "Really enjoyed it",
        visitDate: null,
        vehicleType: null,
        visitCondition: null,
        recommendedDuration: null,
        recommendedFor: null,
        status: "APPROVED",
        createdAt: new Date(),
        updatedAt: new Date(),
        user: { id: "user-1", name: "Test User", image: null },
        _count: { helpfulVotes: 5 },
      },
    ];

    (prisma.park.findUnique as any).mockResolvedValue(mockPark);
    (prisma.parkReview.count as any).mockResolvedValue(1);
    (prisma.parkReview.findMany as any).mockResolvedValue(mockReviews);
    (auth as any).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/parks/test-park/reviews");
    const response = await GET(request, { params: Promise.resolve({ slug: "test-park" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reviews).toHaveLength(1);
    expect(data.pagination.total).toBe(1);
  });
});

describe("POST /api/parks/[slug]/reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 401 for unauthenticated users", async () => {
    (auth as any).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/parks/test-park/reviews", {
      method: "POST",
      body: JSON.stringify({
        overallRating: 5,
        terrainRating: 4,
        facilitiesRating: 4,
        difficultyRating: 3,
        body: "Test review",
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ slug: "test-park" }) });

    expect(response.status).toBe(401);
  });

  it("should return 404 if park not found", async () => {
    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.park.findUnique as any).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/parks/test-park/reviews", {
      method: "POST",
      body: JSON.stringify({
        overallRating: 5,
        terrainRating: 4,
        facilitiesRating: 4,
        difficultyRating: 3,
        body: "Test review",
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ slug: "test-park" }) });

    expect(response.status).toBe(404);
  });

  it("should return 400 if user already reviewed park", async () => {
    const mockPark = { id: "park-123", slug: "test-park" };
    const mockExistingReview = { id: "review-1" };

    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.park.findUnique as any).mockResolvedValue(mockPark);
    (prisma.parkReview.findUnique as any).mockResolvedValue(mockExistingReview);

    const request = new NextRequest("http://localhost/api/parks/test-park/reviews", {
      method: "POST",
      body: JSON.stringify({
        overallRating: 5,
        terrainRating: 4,
        facilitiesRating: 4,
        difficultyRating: 3,
        body: "Test review",
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ slug: "test-park" }) });
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toContain("already reviewed");
  });

  it("should create a review successfully", async () => {
    const mockPark = { id: "park-123", slug: "test-park" };
    const mockCreatedReview = {
      id: "review-1",
      parkId: "park-123",
      userId: "user-1",
      overallRating: 5,
      terrainRating: 4,
      facilitiesRating: 4,
      difficultyRating: 3,
      title: null,
      body: "Test review",
      visitDate: null,
      vehicleType: null,
      visitCondition: null,
      recommendedDuration: null,
      recommendedFor: null,
      status: "PENDING",
      createdAt: new Date(),
      updatedAt: new Date(),
      user: { id: "user-1", name: "Test User", image: null },
      _count: { helpfulVotes: 0 },
    };

    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.park.findUnique as any).mockResolvedValue(mockPark);
    (prisma.parkReview.findUnique as any).mockResolvedValue(null);
    (prisma.parkReview.create as any).mockResolvedValue(mockCreatedReview);

    const request = new NextRequest("http://localhost/api/parks/test-park/reviews", {
      method: "POST",
      body: JSON.stringify({
        overallRating: 5,
        terrainRating: 4,
        facilitiesRating: 4,
        difficultyRating: 3,
        body: "Test review",
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ slug: "test-park" }) });
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.success).toBe(true);
    expect(data.review).toBeDefined();
  });

  it("should return 400 if required fields are missing", async () => {
    const mockPark = { id: "park-123", slug: "test-park" };

    (auth as any).mockResolvedValue({ user: { id: "user-1" } });
    (prisma.park.findUnique as any).mockResolvedValue(mockPark);
    (prisma.parkReview.findUnique as any).mockResolvedValue(null);

    const request = new NextRequest("http://localhost/api/parks/test-park/reviews", {
      method: "POST",
      body: JSON.stringify({
        overallRating: 5,
        // Missing other required ratings and body
      }),
    });

    const response = await POST(request, { params: Promise.resolve({ slug: "test-park" }) });

    expect(response.status).toBe(400);
  });
});
