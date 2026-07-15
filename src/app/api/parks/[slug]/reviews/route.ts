import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transformDbReview } from "@/lib/types";
import type {
  DbReview,
  VehicleType,
  VisitCondition,
  RecommendedDuration,
} from "@/lib/types";
import {
  ALL_VEHICLE_TYPES,
  ALL_VISIT_CONDITIONS,
  ALL_RECOMMENDED_DURATIONS,
} from "@/lib/constants";
import { checkRateLimit, rateLimited, RATE_LIMITS } from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/api-helpers";

const ratingSchema = z
  .number({ error: "All ratings are required" })
  .int()
  .min(1, "Ratings must be between 1 and 5")
  .max(5, "Ratings must be between 1 and 5");

const reviewCreateSchema = z.object({
  overallRating: ratingSchema,
  terrainRating: ratingSchema,
  facilitiesRating: ratingSchema,
  difficultyRating: ratingSchema,
  body: z.string().trim().min(1, "Review body is required").max(5000),
  title: z.string().trim().max(200).nullish(),
  visitDate: z.string().nullish(),
  vehicleType: z
    .enum(ALL_VEHICLE_TYPES as [VehicleType, ...VehicleType[]])
    .nullish(),
  visitCondition: z
    .enum(ALL_VISIT_CONDITIONS as [VisitCondition, ...VisitCondition[]])
    .nullish(),
  recommendedDuration: z
    .enum(
      ALL_RECOMMENDED_DURATIONS as [
        RecommendedDuration,
        ...RecommendedDuration[],
      ],
    )
    .nullish(),
  recommendedFor: z.string().trim().max(500).nullish(),
});

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

  const limited = rateLimited(
    checkRateLimit(`reviews:${session.user.id}`, RATE_LIMITS.reviews),
  );
  if (limited) return limited;

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

  const parsed = await parseJsonBody(request, reviewCreateSchema);
  if ("response" in parsed) return parsed.response;
  const data = parsed.data;

  try {
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
