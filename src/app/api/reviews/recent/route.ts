import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transformDbReview } from "@/lib/types";
import type { DbReview } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/reviews/recent - Get recent reviews across all parks
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  const session = await auth();
  const currentUserId = session?.user?.id;

  // Get total count of approved reviews
  const total = await prisma.parkReview.count({
    where: {
      status: "APPROVED",
    },
  });

  // Get paginated reviews
  const dbReviews = await prisma.parkReview.findMany({
    where: {
      status: "APPROVED",
    },
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
      helpfulVotes: currentUserId
        ? {
            where: { userId: currentUserId },
            select: { id: true, userId: true },
          }
        : false,
      _count: {
        select: { helpfulVotes: true },
      },
    },
    orderBy: { createdAt: "desc" },
    skip,
    take: limit,
  });

  const reviews = dbReviews.map((review) =>
    transformDbReview(review as DbReview, currentUserId)
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
