import { prisma } from "@/lib/prisma";
import type { RecommendedDuration } from "@prisma/client";

/**
 * Recalculate and update the average rating and review count for a park
 * based on its APPROVED reviews only.
 */
export async function recalculateParkRatings(parkId: string): Promise<void> {
  const aggregation = await prisma.parkReview.aggregate({
    where: {
      parkId,
      status: "APPROVED",
    },
    _avg: {
      overallRating: true,
      difficultyRating: true,
      terrainRating: true,
      facilitiesRating: true,
    },
    _count: {
      id: true,
    },
  });

  // Calculate the most frequently recommended duration
  const averageRecommendedStay = await calculateMostFrequentDuration(parkId);

  await prisma.park.update({
    where: { id: parkId },
    data: {
      averageRating: aggregation._avg.overallRating,
      averageDifficulty: aggregation._avg.difficultyRating,
      averageTerrain: aggregation._avg.terrainRating,
      averageFacilities: aggregation._avg.facilitiesRating,
      reviewCount: aggregation._count.id,
      averageRecommendedStay,
    },
  });
}

/**
 * Calculate the most frequently occurring recommendedDuration from approved reviews
 */
async function calculateMostFrequentDuration(
  parkId: string
): Promise<RecommendedDuration | null> {
  const durationCounts = await prisma.parkReview.groupBy({
    by: ["recommendedDuration"],
    where: {
      parkId,
      status: "APPROVED",
      recommendedDuration: { not: null },
    },
    _count: {
      recommendedDuration: true,
    },
    orderBy: {
      _count: {
        recommendedDuration: "desc",
      },
    },
    take: 1,
  });

  if (durationCounts.length === 0 || !durationCounts[0].recommendedDuration) {
    return null;
  }

  return durationCounts[0].recommendedDuration;
}
