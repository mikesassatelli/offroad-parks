// TODO OP-80: Bulk Park Research
// Admin UI to trigger research for multiple parks at once.
// Progress tracking, cost estimation before launch, abort capability, rate limiting.

import type { ResearchTrigger } from "@/lib/types";

export type BulkResearchOptions = {
  parkIds: string[];
  trigger: ResearchTrigger;
  maxConcurrent?: number;
  dailyBudgetUSD?: number;
};

export type BulkResearchProgress = {
  total: number;
  completed: number;
  failed: number;
  estimatedCostUSD: number;
  status: "pending" | "running" | "completed" | "aborted";
};

/**
 * Run research on multiple parks with rate limiting and progress tracking.
 * TODO OP-80: Implement batch orchestration with concurrency control,
 * cost estimation, abort capability, and progress reporting.
 */
export async function runBulkResearch(
  _options: BulkResearchOptions,
): Promise<BulkResearchProgress> {
  throw new Error("OP-80: Bulk research not yet implemented");
}

/**
 * Estimate the cost of researching a set of parks before launching.
 * TODO OP-80: Query source counts, estimate token usage per park.
 */
export async function estimateBulkResearchCost(
  _parkIds: string[],
): Promise<{ estimatedCostUSD: number; parkCount: number; sourceCount: number }> {
  throw new Error("OP-80: Cost estimation not yet implemented");
}
