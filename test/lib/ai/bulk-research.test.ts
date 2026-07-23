import { describe, it, expect } from "vitest";
import {
  runBulkResearch,
  estimateBulkResearchCost,
  AVG_COST_PER_PARK_USD,
} from "@/lib/ai/bulk-research";

const ids = (n: number) => Array.from({ length: n }, (_, i) => `park-${i}`);

describe("runBulkResearch", () => {
  it("processes every park when within budget", async () => {
    const seen: string[] = [];
    const progress = await runBulkResearch(
      { parkIds: ids(4), trigger: "SCHEDULED_CRON" },
      { runPark: async (id) => void seen.push(id), now: () => 0 }
    );
    expect(progress.completed).toBe(4);
    expect(progress.failed).toBe(0);
    expect(progress.status).toBe("completed");
    expect(progress.processed).toHaveLength(4);
    expect(seen.sort()).toEqual(ids(4).sort());
  });

  it("counts failures without aborting the batch", async () => {
    const progress = await runBulkResearch(
      { parkIds: ids(3), trigger: "SCHEDULED_CRON", maxConcurrent: 1 },
      {
        now: () => 0,
        runPark: async (id) => {
          if (id === "park-1") throw new Error("boom");
        },
      }
    );
    expect(progress.completed).toBe(2);
    expect(progress.failed).toBe(1);
    expect(progress.status).toBe("completed");
  });

  it("stops starting new parks once the time budget is exhausted", async () => {
    let clock = 0;
    const processed: string[] = [];
    const progress = await runBulkResearch(
      {
        parkIds: ids(5),
        trigger: "SCHEDULED_CRON",
        maxConcurrent: 1,
        timeBudgetMs: 150,
      },
      {
        now: () => clock,
        runPark: async (id) => {
          processed.push(id);
          clock += 100; // each park "takes" 100ms
        },
      }
    );
    // start(0) → park0 (clock 100) → park1 (clock 200) → 200>=150 abort
    expect(processed).toEqual(["park-0", "park-1"]);
    expect(progress.completed).toBe(2);
    expect(progress.status).toBe("aborted");
  });

  it("never exceeds maxConcurrent parallel runs", async () => {
    let active = 0;
    let maxActive = 0;
    await runBulkResearch(
      { parkIds: ids(6), trigger: "SCHEDULED_CRON", maxConcurrent: 2 },
      {
        now: () => 0,
        runPark: async () => {
          active++;
          maxActive = Math.max(maxActive, active);
          await new Promise((r) => setTimeout(r, 5));
          active--;
        },
      }
    );
    expect(maxActive).toBe(2);
  });

  it("honors a daily cost ceiling", async () => {
    const processed: string[] = [];
    const progress = await runBulkResearch(
      {
        parkIds: ids(10),
        trigger: "SCHEDULED_CRON",
        maxConcurrent: 1,
        dailyBudgetUSD: AVG_COST_PER_PARK_USD * 3, // room for ~3 parks
      },
      { now: () => 0, runPark: async (id) => void processed.push(id) }
    );
    expect(processed).toHaveLength(3);
    expect(progress.status).toBe("aborted");
  });

  it("handles an empty park list", async () => {
    const progress = await runBulkResearch(
      { parkIds: [], trigger: "SCHEDULED_CRON" },
      { now: () => 0, runPark: async () => {} }
    );
    expect(progress).toMatchObject({ total: 0, completed: 0, status: "completed" });
  });
});

describe("estimateBulkResearchCost", () => {
  it("returns zeros for an empty list without touching the DB", async () => {
    const estimate = await estimateBulkResearchCost([]);
    expect(estimate).toEqual({
      estimatedCostUSD: 0,
      parkCount: 0,
      sourceCount: 0,
    });
  });
});
