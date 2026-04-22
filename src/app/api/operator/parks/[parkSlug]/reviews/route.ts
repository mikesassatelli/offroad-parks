import { NextResponse } from "next/server";
import { getOperatorContext } from "@/lib/operator-auth";
import { prisma } from "@/lib/prisma";
import { transformDbReview } from "@/lib/types";
import type { DbReview, ReviewStatus } from "@/lib/types";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ parkSlug: string }>;
};

// GET /api/operator/parks/[parkSlug]/reviews
// List reviews for this operator's park.
export async function GET(request: Request, { params }: RouteParams) {
  const { parkSlug } = await params;

  const ctx = await getOperatorContext(parkSlug);
  if (!ctx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as ReviewStatus | null;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  const where: {
    parkId: string;
    status?: ReviewStatus;
  } = { parkId: ctx.parkId };
  if (status) where.status = status;

  const total = await prisma.parkReview.count({ where });

  const dbReviews = await prisma.parkReview.findMany({
    where,
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      park: {
        select: {
          id: true,
          name: true,
          slug: true,
          address: {
            select: {
              state: true,
            },
          },
        },
      },
      _count: {
        select: { helpfulVotes: true },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });

  const reviews = dbReviews.map((review) =>
    transformDbReview(review as DbReview),
  );

  return NextResponse.json({
    reviews,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  });
}
