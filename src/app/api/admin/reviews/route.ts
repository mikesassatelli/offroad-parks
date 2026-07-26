import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAdminView } from "@/lib/roles";
import { transformDbReview } from "@/lib/types";
import type { DbReview, ReviewStatus } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/admin/reviews - Get all reviews (admin view access)
export async function GET(request: Request) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Allow admin viewers (incl. read-only beta testers) to browse reviews.
  if (!canAdminView(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status") as ReviewStatus | null;
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const skip = (page - 1) * limit;

  // Build where clause
  const where = status ? { status } : {};

  // Get total count
  const total = await prisma.parkReview.count({ where });

  // Get paginated reviews
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
    transformDbReview(review as DbReview)
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
