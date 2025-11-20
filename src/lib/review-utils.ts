import { prisma } from "@/lib/prisma";

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

  await prisma.park.update({
    where: { id: parkId },
    data: {
      averageRating: aggregation._avg.overallRating,
      averageDifficulty: aggregation._avg.difficultyRating,
      averageTerrain: aggregation._avg.terrainRating,
      averageFacilities: aggregation._avg.facilitiesRating,
      reviewCount: aggregation._count.id,
    },
  });
}
