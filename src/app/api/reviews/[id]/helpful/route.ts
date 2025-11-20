import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// POST /api/reviews/[id]/helpful - Toggle helpful vote
export async function POST(_request: Request, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id: reviewId } = await params;

  // Find the review
  const review = await prisma.parkReview.findUnique({
    where: { id: reviewId },
  });

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  // Users cannot vote on their own reviews
  if (review.userId === session.user.id) {
    return NextResponse.json(
      { error: "Cannot vote on your own review" },
      { status: 400 }
    );
  }

  // Check if vote already exists
  const existingVote = await prisma.reviewHelpfulVote.findUnique({
    where: {
      userId_reviewId: {
        userId: session.user.id,
        reviewId,
      },
    },
  });

  let hasVoted: boolean;

  if (existingVote) {
    // Remove the vote
    await prisma.reviewHelpfulVote.delete({
      where: { id: existingVote.id },
    });
    hasVoted = false;
  } else {
    // Add the vote
    await prisma.reviewHelpfulVote.create({
      data: {
        userId: session.user.id,
        reviewId,
      },
    });
    hasVoted = true;
  }

  // Get updated count
  const helpfulCount = await prisma.reviewHelpfulVote.count({
    where: { reviewId },
  });

  return NextResponse.json({
    success: true,
    hasVoted,
    helpfulCount,
  });
}
