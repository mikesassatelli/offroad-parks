import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transformDbReview } from "@/lib/types";
import type { DbReview } from "@/lib/types";

export const runtime = "nodejs";

// GET /api/reviews/user - Get current user's reviews
export async function GET() {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const dbReviews = await prisma.parkReview.findMany({
    where: {
      userId: session.user.id,
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
      _count: {
        select: { helpfulVotes: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const reviews = dbReviews.map((review) =>
    transformDbReview(review as DbReview, session.user?.id)
  );

  return NextResponse.json({ reviews });
}
