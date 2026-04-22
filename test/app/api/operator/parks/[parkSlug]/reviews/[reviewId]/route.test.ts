import { NextRequest } from "next/server";
import { PATCH } from "@/app/api/operator/parks/[parkSlug]/reviews/[reviewId]/route";
import { prisma } from "@/lib/prisma";
import { getOperatorContext } from "@/lib/operator-auth";
import { recalculateParkRatings } from "@/lib/review-utils";
import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("@/lib/prisma", () => ({
  prisma: {
    parkReview: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/operator-auth", () => ({
  getOperatorContext: vi.fn(),
}));

vi.mock("@/lib/review-utils", () => ({
  recalculateParkRatings: vi.fn().mockResolvedValue(undefined),
}));

const operatorCtx = {
  userId: "user-1",
  operatorId: "op-1",
  operatorName: "Test Operator",
  parkId: "park-1",
  parkName: "Test Park",
  parkSlug: "test-park",
  role: "OWNER",
};

const ownReview = { id: "rev-1", parkId: "park-1" };
const otherReview = { id: "rev-2", parkId: "other-park" };

function makeRequest(body: unknown) {
  return new NextRequest(
    "http://localhost/api/operator/parks/test-park/reviews/rev-1",
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
  );
}

describe("PATCH /api/operator/parks/[parkSlug]/reviews/[reviewId]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 403 when user is not an operator for this park", async () => {
    vi.mocked(getOperatorContext).mockResolvedValue(null);

    const res = await PATCH(makeRequest({ status: "APPROVED" }), {
      params: Promise.resolve({ parkSlug: "test-park", reviewId: "rev-1" }),
    });

    expect(res.status).toBe(403);
  });

  it("returns 403 when operator tries to moderate a review from another park", async () => {
    vi.mocked(getOperatorContext).mockResolvedValue(operatorCtx);
    vi.mocked(prisma.parkReview.findUnique).mockResolvedValue(otherReview as any);

    const res = await PATCH(makeRequest({ status: "HIDDEN" }), {
      params: Promise.resolve({ parkSlug: "test-park", reviewId: "rev-2" }),
    });

    expect(res.status).toBe(403);
    expect(prisma.parkReview.update).not.toHaveBeenCalled();
  });

  it("returns 404 when review not found", async () => {
    vi.mocked(getOperatorContext).mockResolvedValue(operatorCtx);
    vi.mocked(prisma.parkReview.findUnique).mockResolvedValue(null);

    const res = await PATCH(makeRequest({ status: "APPROVED" }), {
      params: Promise.resolve({ parkSlug: "test-park", reviewId: "missing" }),
    });

    expect(res.status).toBe(404);
  });

  it("rejects invalid statuses (operator cannot set PENDING)", async () => {
    vi.mocked(getOperatorContext).mockResolvedValue(operatorCtx);

    const res = await PATCH(makeRequest({ status: "PENDING" }), {
      params: Promise.resolve({ parkSlug: "test-park", reviewId: "rev-1" }),
    });

    expect(res.status).toBe(400);
  });

  it("approves a review and triggers rating recalculation", async () => {
    vi.mocked(getOperatorContext).mockResolvedValue(operatorCtx);
    vi.mocked(prisma.parkReview.findUnique).mockResolvedValue(ownReview as any);
    vi.mocked(prisma.parkReview.update).mockResolvedValue({
      ...ownReview,
      status: "APPROVED",
    } as any);

    const res = await PATCH(makeRequest({ status: "APPROVED" }), {
      params: Promise.resolve({ parkSlug: "test-park", reviewId: "rev-1" }),
    });

    expect(res.status).toBe(200);
    expect(prisma.parkReview.update).toHaveBeenCalledWith({
      where: { id: "rev-1" },
      data: { status: "APPROVED" },
    });
    expect(recalculateParkRatings).toHaveBeenCalledWith("park-1");
  });

  it("hides a review belonging to the operator's park", async () => {
    vi.mocked(getOperatorContext).mockResolvedValue(operatorCtx);
    vi.mocked(prisma.parkReview.findUnique).mockResolvedValue(ownReview as any);
    vi.mocked(prisma.parkReview.update).mockResolvedValue({
      ...ownReview,
      status: "HIDDEN",
    } as any);

    const res = await PATCH(makeRequest({ status: "HIDDEN" }), {
      params: Promise.resolve({ parkSlug: "test-park", reviewId: "rev-1" }),
    });

    expect(res.status).toBe(200);
    expect(prisma.parkReview.update).toHaveBeenCalledWith({
      where: { id: "rev-1" },
      data: { status: "HIDDEN" },
    });
  });
});
