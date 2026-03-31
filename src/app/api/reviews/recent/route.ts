import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transformDbReview } from "@/lib/types";
import type { DbReview } from "@/lib/types";
import type { VehicleType } from "@prisma/client";

export const runtime = "nodejs";

// GET /api/reviews/recent
// Supports: page, limit, minRating, vehicleType, state
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "10");
  const skip = (page - 1) * limit;
  const minRating = searchParams.get("minRating")
    ? parseFloat(searchParams.get("minRating")!)
    : undefined;
  const vehicleType = searchParams.get("vehicleType") || undefined;
  const state = searchParams.get("state") || undefined;

  const session = await auth();
  const currentUserId = session?.user?.id;

  // Build where clause with optional filters
  const where = {
    status: "APPROVED" as const,
    ...(minRating !== undefined && { overallRating: { gte: minRating } }),
    ...(vehicleType && { vehicleType: vehicleType as VehicleType }),
    ...(state && { park: { address: { state } } }),
  };

  const [total, dbReviews] = await Promise.all([
    prisma.parkReview.count({ where }),
    prisma.parkReview.findMany({
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
    }),
  ]);

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
