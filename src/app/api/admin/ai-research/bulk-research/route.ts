import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { runBulkResearch, estimateBulkResearchCost } from "@/lib/ai/bulk-research";
import type { BulkResearchJobStatus, BulkResearchJobSummary } from "@/lib/types";

// POST — Create a new BulkResearchJob and fire-and-forget the run
export async function POST(request: Request) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  let body: { parkIds?: string[]; maxParks?: number; maxCostUSD?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { parkIds, maxParks, maxCostUSD } = body;

  if (!parkIds || !Array.isArray(parkIds) || parkIds.length === 0) {
    return NextResponse.json(
      { error: "parkIds must be a non-empty array" },
      { status: 400 }
    );
  }
  if (!maxParks || typeof maxParks !== "number" || maxParks < 1) {
    return NextResponse.json(
      { error: "maxParks must be >= 1" },
      { status: 400 }
    );
  }
  if (!maxCostUSD || typeof maxCostUSD !== "number" || maxCostUSD <= 0) {
    return NextResponse.json(
      { error: "maxCostUSD must be > 0" },
      { status: 400 }
    );
  }

  // Verify all park IDs exist
  const existingParks = await prisma.park.findMany({
    where: { id: { in: parkIds } },
    select: { id: true },
  });
  const existingIds = new Set(existingParks.map((p) => p.id));
  const invalidIds = parkIds.filter((id) => !existingIds.has(id));
  if (invalidIds.length > 0) {
    return NextResponse.json(
      { error: `Invalid park IDs: ${invalidIds.join(", ")}` },
      { status: 400 }
    );
  }

  // Create the job record
  const job = await prisma.bulkResearchJob.create({
    data: {
      status: "QUEUED",
      parkIds: parkIds,
      totalParks: parkIds.length,
      maxParks,
      maxCostUSD,
    },
  });

  // Fire-and-forget
  runBulkResearch(job.id).catch((err) => {
    console.error(`[bulk-research] Job ${job.id} failed:`, err);
  });

  return NextResponse.json({ success: true, jobId: job.id });
}

// GET — List jobs or get a specific job
export async function GET(request: Request) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const { searchParams } = new URL(request.url);
  const jobId = searchParams.get("jobId");
  const action = searchParams.get("action");

  // Cost estimation endpoint
  if (action === "estimate") {
    const parkIdsParam = searchParams.get("parkIds");
    if (!parkIdsParam) {
      return NextResponse.json(
        { error: "parkIds query param required for estimate" },
        { status: 400 }
      );
    }
    const parkIds = parkIdsParam.split(",").filter(Boolean);
    if (parkIds.length === 0) {
      return NextResponse.json(
        { error: "parkIds must be non-empty" },
        { status: 400 }
      );
    }

    try {
      const estimate = await estimateBulkResearchCost(parkIds);
      return NextResponse.json(estimate);
    } catch (error) {
      return NextResponse.json(
        { error: "Failed to estimate cost" },
        { status: 500 }
      );
    }
  }

  // Single job
  if (jobId) {
    const job = await prisma.bulkResearchJob.findUnique({
      where: { id: jobId },
    });
    if (!job) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    // Resolve currentParkName if currentParkId is set
    let currentParkName: string | null = null;
    if (job.currentParkId) {
      const park = await prisma.park.findUnique({
        where: { id: job.currentParkId },
        select: { name: true },
      });
      currentParkName = park?.name ?? null;
    }

    const summary: BulkResearchJobSummary = {
      id: job.id,
      status: job.status as BulkResearchJobStatus,
      totalParks: job.totalParks,
      completedParks: job.completedParks,
      failedParks: job.failedParks,
      currentParkId: job.currentParkId,
      currentParkName,
      maxParks: job.maxParks,
      maxCostUSD: job.maxCostUSD,
      spentCostUSD: job.spentCostUSD,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt?.toISOString() ?? null,
      completedAt: job.completedAt?.toISOString() ?? null,
      createdAt: job.createdAt.toISOString(),
    };

    return NextResponse.json({ job: summary });
  }

  // List recent jobs
  const jobs = await prisma.bulkResearchJob.findMany({
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  const summaries: BulkResearchJobSummary[] = await Promise.all(
    jobs.map(async (job) => {
      let currentParkName: string | null = null;
      if (job.currentParkId) {
        const park = await prisma.park.findUnique({
          where: { id: job.currentParkId },
          select: { name: true },
        });
        currentParkName = park?.name ?? null;
      }

      return {
        id: job.id,
        status: job.status as BulkResearchJobStatus,
        totalParks: job.totalParks,
        completedParks: job.completedParks,
        failedParks: job.failedParks,
        currentParkId: job.currentParkId,
        currentParkName,
        maxParks: job.maxParks,
        maxCostUSD: job.maxCostUSD,
        spentCostUSD: job.spentCostUSD,
        errorMessage: job.errorMessage,
        startedAt: job.startedAt?.toISOString() ?? null,
        completedAt: job.completedAt?.toISOString() ?? null,
        createdAt: job.createdAt.toISOString(),
      };
    })
  );

  return NextResponse.json({ jobs: summaries });
}
