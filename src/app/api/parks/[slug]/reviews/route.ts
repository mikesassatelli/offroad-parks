import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transformDbReview } from "@/lib/types";
import type { DbReview } from "@/lib/types";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    slug: string;
  }>;
};

// GET /api/parks/[slug]/reviews - Get reviews for a park
export async function GET(request: Request, { params }: RouteParams) {
  const { slug } = await params;
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;

  const session = await auth();
  const currentUserId = session?.user?.id;

  // Find park by slug
  const park = await prisma.park.findUnique({
    where: { slug },
  });

  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  // Get total count of approved reviews
  const total = await prisma.parkReview.count({
    where: {
      parkId: park.id,
      status: "APPROVED",
    },
  });

  // Get paginated reviews
  const dbReviews = await prisma.parkReview.findMany({
    where: {
      parkId: park.id,
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

// POST /api/parks/[slug]/reviews - Create a review
export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  // Find park by slug
  const park = await prisma.park.findUnique({
    where: { slug },
  });

  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  // Check if user already has a review for this park
  const existingReview = await prisma.parkReview.findUnique({
    where: {
      userId_parkId: {
        userId: session.user.id,
        parkId: park.id,
      },
    },
  });

  if (existingReview) {
    return NextResponse.json(
      { error: "You have already reviewed this park" },
      { status: 400 }
    );
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

    const review = await prisma.parkReview.create({
      data: {
        parkId: park.id,
        userId: session.user.id,
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
        status: "PENDING",
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

    return NextResponse.json({
      success: true,
      review: transformDbReview(review as DbReview, session.user.id),
      message: "Review submitted successfully. It will be visible after admin approval.",
    });
  } catch (error) {
    console.error("Error creating review:", error);
    return NextResponse.json(
      { error: "Failed to create review" },
      { status: 500 }
    );
  }
}
