import { GET } from "@/app/api/reviews/recent/route";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    parkReview: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth", () => ({
  auth: vi.fn(),
}));

const mockDbReview = {
  id: "review-1",
  parkId: "park-1",
  userId: "user-1",
  overallRating: 4,
  terrainRating: 4,
  facilitiesRating: 3,
  difficultyRating: 3,
  recommendedDuration: null,
  vehicleType: null,
  body: "Great park!",
  status: "APPROVED" as const,
  title: null,
  visitDate: null,
  visitCondition: null,
  recommendedFor: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
  user: { id: "user-1", name: "Alice", image: null },
  park: {
    id: "park-1",
    name: "Test Park",
    slug: "test-park",
    address: { state: "California" },
  },
  helpfulVotes: [],
  _count: { helpfulVotes: 2 },
};

describe("GET /api/reviews/recent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue(null);
  });

  it("should return paginated reviews with default page=1 and limit=10", async () => {
    (prisma.parkReview.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (prisma.parkReview.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockDbReview]);

    const request = new Request("http://localhost/api/reviews/recent");
    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.reviews).toHaveLength(1);
    expect(data.pagination.page).toBe(1);
    expect(data.pagination.limit).toBe(10);
    expect(data.pagination.total).toBe(1);
    expect(data.pagination.totalPages).toBe(1);
  });

  it("should support page and limit query params", async () => {
    (prisma.parkReview.count as ReturnType<typeof vi.fn>).mockResolvedValue(25);
    (prisma.parkReview.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const request = new Request("http://localhost/api/reviews/recent?page=2&limit=5");
    const response = await GET(request);
    const data = await response.json();

    expect(data.pagination.page).toBe(2);
    expect(data.pagination.limit).toBe(5);
    expect(data.pagination.totalPages).toBe(5);

    expect(prisma.parkReview.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 5, take: 5 }),
    );
  });

  it("should filter by minRating", async () => {
    (prisma.parkReview.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.parkReview.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const request = new Request("http://localhost/api/reviews/recent?minRating=4");
    await GET(request);

    expect(prisma.parkReview.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ overallRating: { gte: 4 } }),
      }),
    );
  });

  it("should filter by vehicleType", async () => {
    (prisma.parkReview.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.parkReview.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const request = new Request("http://localhost/api/reviews/recent?vehicleType=atv");
    await GET(request);

    expect(prisma.parkReview.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ vehicleType: "atv" }),
      }),
    );
  });

  it("should filter by state", async () => {
    (prisma.parkReview.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.parkReview.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const request = new Request("http://localhost/api/reviews/recent?state=California");
    await GET(request);

    expect(prisma.parkReview.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          park: { address: { state: "California" } },
        }),
      }),
    );
  });

  it("should include park info in reviews", async () => {
    (prisma.parkReview.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (prisma.parkReview.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([mockDbReview]);

    const request = new Request("http://localhost/api/reviews/recent");
    const response = await GET(request);
    const data = await response.json();

    expect(data.reviews[0].parkName).toBe("Test Park");
    expect(data.reviews[0].parkSlug).toBe("test-park");
    expect(data.reviews[0].parkState).toBe("California");
  });

  it("should return empty array when no reviews", async () => {
    (prisma.parkReview.count as ReturnType<typeof vi.fn>).mockResolvedValue(0);
    (prisma.parkReview.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const request = new Request("http://localhost/api/reviews/recent");
    const response = await GET(request);
    const data = await response.json();

    expect(data.reviews).toHaveLength(0);
    expect(data.pagination.total).toBe(0);
    expect(data.pagination.totalPages).toBe(0);
  });

  it("should include helpful vote info for authenticated user", async () => {
    (auth as ReturnType<typeof vi.fn>).mockResolvedValue({
      user: { id: "user-1" },
    });
    (prisma.parkReview.count as ReturnType<typeof vi.fn>).mockResolvedValue(1);
    (prisma.parkReview.findMany as ReturnType<typeof vi.fn>).mockResolvedValue([
      { ...mockDbReview, helpfulVotes: [{ id: "vote-1", userId: "user-1" }] },
    ]);

    const request = new Request("http://localhost/api/reviews/recent");
    const response = await GET(request);
    const data = await response.json();

    expect(data.reviews[0].hasVotedHelpful).toBe(true);
  });
});
