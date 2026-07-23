import type { ResearchTrigger } from "@/lib/types";
import { prisma } from "@/lib/prisma";
import { researchPark } from "./research-pipeline";

export type BulkResearchOptions = {
  parkIds: string[];
  trigger: ResearchTrigger;
  maxConcurrent?: number;
  /** Stop starting new parks after this much wall-clock time (keeps us under the function limit). */
  timeBudgetMs?: number;
  dailyBudgetUSD?: number;
};

export type BulkResearchProgress = {
  total: number;
  completed: number;
  failed: number;
  processed: string[];
  estimatedCostUSD: number;
  status: "completed" | "aborted";
};

/** Injectable dependencies (tests provide fakes so no DB / clock is needed). */
export type BulkResearchDeps = {
  runPark?: (parkId: string) => Promise<void>;
  now?: () => number;
};

/** Fallback per-park cost when there's no session history to average. */
export const AVG_COST_PER_PARK_USD = 0.03;

const DEFAULT_MAX_CONCURRENT = 2;
const DEFAULT_TIME_BUDGET_MS = 4 * 60_000;

/**
 * Research a set of parks with bounded concurrency and a wall-clock budget.
 * Parks that don't get started before the budget is exhausted are left for the
 * next drain (status "aborted"); everything attempted is reported in `processed`.
 */
export async function runBulkResearch(
  options: BulkResearchOptions,
  deps: BulkResearchDeps = {}
): Promise<BulkResearchProgress> {
  const {
    parkIds,
    trigger,
    maxConcurrent = DEFAULT_MAX_CONCURRENT,
    timeBudgetMs = DEFAULT_TIME_BUDGET_MS,
    dailyBudgetUSD,
  } = options;

  const runPark =
    deps.runPark ??
    ((id: string) => researchPark(id, trigger).then(() => undefined));
  const now = deps.now ?? (() => Date.now());

  const startedAt = now();
  const queue = [...parkIds];
  const processed: string[] = [];
  let completed = 0;
  let failed = 0;
  let budgetExhausted = false;

  // Soft cost ceiling: stop starting new parks once projected spend would exceed
  // the daily budget (rough, based on an average per-park cost).
  const costCeilingReached = () =>
    dailyBudgetUSD !== undefined &&
    processed.length * AVG_COST_PER_PARK_USD >= dailyBudgetUSD;

  const worker = async () => {
    while (queue.length > 0) {
      if (now() - startedAt >= timeBudgetMs || costCeilingReached()) {
        budgetExhausted = true;
        return;
      }
      const id = queue.shift();
      if (id === undefined) return;
      processed.push(id);
      try {
        await runPark(id);
        completed++;
      } catch {
        failed++;
      }
    }
  };

  const workerCount = Math.max(1, Math.min(maxConcurrent, parkIds.length || 1));
  await Promise.all(Array.from({ length: workerCount }, () => worker()));

  const aborted = budgetExhausted && queue.length > 0;
  return {
    total: parkIds.length,
    completed,
    failed,
    processed,
    estimatedCostUSD: round2(processed.length * AVG_COST_PER_PARK_USD),
    status: aborted ? "aborted" : "completed",
  };
}

/**
 * Estimate the cost of researching a set of parks before launching, using the
 * average cost of past completed sessions when available.
 */
export async function estimateBulkResearchCost(
  parkIds: string[]
): Promise<{ estimatedCostUSD: number; parkCount: number; sourceCount: number }> {
  const parkCount = parkIds.length;
  if (parkCount === 0) {
    return { estimatedCostUSD: 0, parkCount: 0, sourceCount: 0 };
  }

  const [agg, sourceCount] = await Promise.all([
    prisma.researchSession.aggregate({
      where: { status: "COMPLETED", estimatedCostUSD: { gt: 0 } },
      _avg: { estimatedCostUSD: true },
    }),
    prisma.dataSource.count({ where: { parkId: { in: parkIds } } }),
  ]);

  const avgCost = agg._avg.estimatedCostUSD ?? AVG_COST_PER_PARK_USD;
  return {
    estimatedCostUSD: round2(avgCost * parkCount),
    parkCount,
    sourceCount,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
