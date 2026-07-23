import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { researchPark } from "@/lib/ai/research-pipeline";
import { runBulkResearch } from "@/lib/ai/bulk-research";
import { reconcileStuckResearch } from "@/lib/ai/research-lifecycle";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Research is I/O-heavy (crawl + LLM per source); use the full Pro window. The
// in-function time budget stops starting new parks a few seconds before this.
export const maxDuration = 300;

// Max parks to consider per drain. The wall-clock budget usually stops us sooner;
// leftovers wait for the next tick.
const BATCH_SIZE = 20;
const TIME_BUDGET_MS = 270_000;
const MAX_CONCURRENT = 2;

/**
 * Drain the bulk-research queue: pick the oldest queued parks and research a
 * time-boxed batch, clearing each park's queue flag as it goes. Scheduled every
 * 15 min via vercel.json `crons`. Vercel attaches `Authorization: Bearer
 * $CRON_SECRET` to scheduled invocations; anything else is rejected once set.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = request.headers.get("authorization");
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    // Heal any orphaned IN_PROGRESS runs before starting new ones.
    await reconcileStuckResearch();

    const queued = await prisma.park.findMany({
      where: { researchQueuedAt: { not: null } },
      orderBy: { researchQueuedAt: "asc" },
      take: BATCH_SIZE,
      select: { id: true },
    });

    if (queued.length === 0) {
      return NextResponse.json({ ok: true, processed: 0, remaining: 0 });
    }

    const progress = await runBulkResearch(
      {
        parkIds: queued.map((p) => p.id),
        trigger: "SCHEDULED_CRON",
        maxConcurrent: MAX_CONCURRENT,
        timeBudgetMs: TIME_BUDGET_MS,
      },
      {
        // Dequeue each park as it's attempted (success or failure) so a park that
        // keeps failing doesn't loop forever; researchPark records its own outcome.
        runPark: async (id) => {
          try {
            await researchPark(id, "SCHEDULED_CRON");
          } finally {
            await prisma.park
              .update({ where: { id }, data: { researchQueuedAt: null } })
              .catch(() => {});
          }
        },
      }
    );

    const remaining = await prisma.park.count({
      where: { researchQueuedAt: { not: null } },
    });

    return NextResponse.json({
      ok: true,
      processed: progress.processed.length,
      completed: progress.completed,
      failed: progress.failed,
      status: progress.status,
      remaining,
    });
  } catch (error) {
    console.error("[cron/research-queue] drain failed", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : "drain failed" },
      { status: 500 }
    );
  }
}
