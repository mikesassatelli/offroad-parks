import { prisma } from "@/lib/prisma";
import { researchPark } from "./research-pipeline";
import { estimateCost } from "./config";

/**
 * Run bulk research on a set of parks sequentially.
 * Updates the BulkResearchJob record after each park.
 * Respects abort signals, cost budgets, and park count limits.
 */
export async function runBulkResearch(jobId: string): Promise<void> {
  const job = await prisma.bulkResearchJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error(`BulkResearchJob not found: ${jobId}`);

  const parkIds = job.parkIds as string[];

  // Set status to RUNNING
  await prisma.bulkResearchJob.update({
    where: { id: jobId },
    data: {
      status: "RUNNING",
      startedAt: new Date(),
    },
  });

  let completedParks = 0;
  let failedParks = 0;
  let spentCostUSD = 0;

  for (const parkId of parkIds) {
    // Check for abort
    const current = await prisma.bulkResearchJob.findUnique({
      where: { id: jobId },
      select: { status: true },
    });
    if (current?.status === "ABORTED") {
      // Already marked ABORTED by the abort endpoint — just stop
      await prisma.bulkResearchJob.update({
        where: { id: jobId },
        data: { currentParkId: null, completedAt: new Date() },
      });
      return;
    }

    // Check cost budget
    if (spentCostUSD >= job.maxCostUSD) {
      await prisma.bulkResearchJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          currentParkId: null,
          completedAt: new Date(),
          errorMessage: `Stopped: cost budget reached ($${spentCostUSD.toFixed(2)} / $${job.maxCostUSD.toFixed(2)})`,
        },
      });
      return;
    }

    // Check park count limit
    if (completedParks >= job.maxParks) {
      await prisma.bulkResearchJob.update({
        where: { id: jobId },
        data: {
          status: "COMPLETED",
          currentParkId: null,
          completedAt: new Date(),
          errorMessage: `Stopped: max parks limit reached (${completedParks} / ${job.maxParks})`,
        },
      });
      return;
    }

    // Set current park
    await prisma.bulkResearchJob.update({
      where: { id: jobId },
      data: { currentParkId: parkId },
    });

    try {
      const { sessionId } = await researchPark(parkId, "ADMIN_MANUAL");

      // Fetch session to get estimated cost
      const session = await prisma.researchSession.findUnique({
        where: { id: sessionId },
        select: { estimatedCostUSD: true },
      });

      const parkCost = session?.estimatedCostUSD ?? 0;
      completedParks++;
      spentCostUSD += parkCost;

      await prisma.bulkResearchJob.update({
        where: { id: jobId },
        data: {
          completedParks,
          spentCostUSD,
        },
      });
    } catch (error) {
      console.error(
        `[bulk-research] Failed to research park ${parkId}:`,
        error
      );
      failedParks++;

      await prisma.bulkResearchJob.update({
        where: { id: jobId },
        data: { failedParks },
      });
    }
  }

  // All parks processed
  const allFailed = completedParks === 0 && failedParks > 0;
  await prisma.bulkResearchJob.update({
    where: { id: jobId },
    data: {
      status: allFailed ? "FAILED" : "COMPLETED",
      currentParkId: null,
      completedAt: new Date(),
      errorMessage: allFailed
        ? `All ${failedParks} parks failed research`
        : null,
    },
  });
}

/**
 * Estimate the cost of researching a set of parks before launching.
 * Counts DataSource records (excluding SKIPPED/WRONG_PARK) per park,
 * then estimates token usage per source extraction.
 */
export async function estimateBulkResearchCost(
  parkIds: string[]
): Promise<{ estimatedCostUSD: number; parkCount: number; sourceCount: number }> {
  // Count sources per park that would be crawled
  const sourceCount = await prisma.dataSource.count({
    where: {
      parkId: { in: parkIds },
      crawlStatus: { notIn: ["SKIPPED", "WRONG_PARK"] },
    },
  });

  // Rough estimate: ~2000 input + ~500 output tokens per source extraction
  // Parks with no sources will still trigger source discovery (~1000 input + ~300 output)
  const parksWithSources = await prisma.dataSource.groupBy({
    by: ["parkId"],
    where: {
      parkId: { in: parkIds },
      crawlStatus: { notIn: ["SKIPPED", "WRONG_PARK"] },
    },
  });

  const parksWithoutSources = parkIds.length - parksWithSources.length;

  // Source extraction cost
  const extractionCost = estimateCost(
    sourceCount * 2000,
    sourceCount * 500
  );

  // Discovery cost for parks without sources
  const discoveryCost = estimateCost(
    parksWithoutSources * 1000,
    parksWithoutSources * 300
  );

  return {
    estimatedCostUSD: extractionCost + discoveryCost,
    parkCount: parkIds.length,
    sourceCount,
  };
}
