import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateParkRatings } from "@/lib/review-utils";
import { transformDbReview } from "@/lib/types";
import type { DbReview } from "@/lib/types";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// PUT /api/reviews/[id] - Update own review
export async function PUT(request: Request, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Find the review
  const existingReview = await prisma.parkReview.findUnique({
    where: { id },
  });

  if (!existingReview) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  // Check ownership
  if (existingReview.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const data = await request.json();

    // Validate required fields
    if (!data.overallRating || !data.terrainRating || !data.facilitiesRating || !data.difficultyRating) {
      return NextResponse.json(
        { error: "All ratings are required" },
        { status: 400 }
      );
    }

    if (!data.body || data.body.trim().length === 0) {
      return NextResponse.json(
        { error: "Review body is required" },
        { status: 400 }
      );
    }

    // Validate rating ranges
    const ratings = [data.overallRating, data.terrainRating, data.facilitiesRating, data.difficultyRating];
    if (ratings.some((r) => r < 1 || r > 5)) {
      return NextResponse.json(
        { error: "Ratings must be between 1 and 5" },
        { status: 400 }
      );
    }

    const review = await prisma.parkReview.update({
      where: { id },
      data: {
        overallRating: data.overallRating,
        terrainRating: data.terrainRating,
        facilitiesRating: data.facilitiesRating,
        difficultyRating: data.difficultyRating,
        title: data.title || null,
        body: data.body.trim(),
        visitDate: data.visitDate ? new Date(data.visitDate) : null,
        vehicleType: data.vehicleType || null,
        visitCondition: data.visitCondition || null,
        recommendedDuration: data.recommendedDuration || null,
        recommendedFor: data.recommendedFor || null,
        status: "PENDING", // Reset to pending after edit
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            image: true,
          },
        },
        _count: {
          select: { helpfulVotes: true },
        },
      },
    });

    // Recalculate park ratings since status changed to PENDING
    await recalculateParkRatings(existingReview.parkId);

    return NextResponse.json({
      success: true,
      review: transformDbReview(review as DbReview, session.user.id),
      message: "Review updated successfully. It will be visible after admin approval.",
    });
  } catch (error) {
    console.error("Error updating review:", error);
    return NextResponse.json(
      { error: "Failed to update review" },
      { status: 500 }
    );
  }
}

// DELETE /api/reviews/[id] - Delete own review
export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  // Find the review
  const review = await prisma.parkReview.findUnique({
    where: { id },
  });

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  // Check ownership
  if (review.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const parkId = review.parkId;

  // Delete the review
  await prisma.parkReview.delete({
    where: { id },
  });

  // Recalculate park ratings
  await recalculateParkRatings(parkId);

  return NextResponse.json({ success: true });
}
