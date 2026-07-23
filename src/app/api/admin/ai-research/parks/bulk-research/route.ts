import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { estimateBulkResearchCost } from "@/lib/ai/bulk-research";

// POST — queue one or more parks for bulk research. The /api/cron/research-queue
// drain picks them up (oldest-queued first) and runs research in time-boxed
// batches. Body: { parkIds: string[] }.
export async function POST(request: Request) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  let body: { parkIds?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parkIds = Array.isArray(body.parkIds)
    ? [...new Set(body.parkIds.filter((id): id is string => typeof id === "string"))]
    : [];
  if (parkIds.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one park id to queue" },
      { status: 400 }
    );
  }

  // Only queue real, approved parks that aren't already queued (don't reset an
  // existing queue position).
  const eligible = await prisma.park.findMany({
    where: { id: { in: parkIds }, status: "APPROVED", researchQueuedAt: null },
    select: { id: true },
  });
  const eligibleIds = eligible.map((p) => p.id);

  if (eligibleIds.length > 0) {
    await prisma.park.updateMany({
      where: { id: { in: eligibleIds } },
      data: { researchQueuedAt: new Date() },
    });
  }

  const estimate = await estimateBulkResearchCost(eligibleIds);

  return NextResponse.json({
    success: true,
    queued: eligibleIds.length,
    alreadyQueuedOrIneligible: parkIds.length - eligibleIds.length,
    estimatedCostUSD: estimate.estimatedCostUSD,
  });
}
