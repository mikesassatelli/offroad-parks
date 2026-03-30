import { prisma } from "@/lib/prisma";
import type { RecommendedDuration } from "@prisma/client";

// Map enum values to ordinal integers for averaging
const DURATION_ORDINAL: Record<RecommendedDuration, number> = {
  quickRide: 1,
  halfDay: 2,
  fullDay: 3,
  overnight: 4,
};

const ORDINAL_DURATION: Record<number, RecommendedDuration> = {
  1: "quickRide",
  2: "halfDay",
  3: "fullDay",
  4: "overnight",
};

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

  const averageRecommendedStay = await calculateRecommendedStay(parkId);

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
 * Calculate the recommended stay duration from approved reviews using a
 * weighted ordinal mean with ceiling rounding. This biases the result
 * towards longer stays — a tie or near-tie always resolves upward.
 *
 * quickRide=1, halfDay=2, fullDay=3, overnight=4
 * e.g. 4× quickRide + 3× halfDay → mean 1.43 → ceil → 2 → halfDay
 */
export async function calculateRecommendedStay(
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
  });

  if (durationCounts.length === 0) return null;

  let totalVotes = 0;
  let weightedSum = 0;

  for (const row of durationCounts) {
    if (!row.recommendedDuration) continue;
    const ordinal = DURATION_ORDINAL[row.recommendedDuration];
    const count = row._count.recommendedDuration;
    weightedSum += ordinal * count;
    totalVotes += count;
  }

  if (totalVotes === 0) return null;

  const mean = weightedSum / totalVotes;
  const ceilOrdinal = Math.min(4, Math.ceil(mean)) as 1 | 2 | 3 | 4;
  return ORDINAL_DURATION[ceilOrdinal];
}
