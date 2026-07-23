import { prisma } from "@/lib/prisma";
import { getDomainAccuracyStats } from "./feedback-loop";

/**
 * Assisted-auto domain reliability tuning.
 *
 * Nightly, we nudge each domain's `defaultReliability` a little way toward the
 * accuracy observed from admin approve/reject feedback — bounded so it drifts
 * gently rather than snapping, and only for domains with enough reviews to
 * trust. Blocking is never automated: low-accuracy domains are surfaced as
 * one-click *suggestions* for an admin to act on. Locked or blocked domains are
 * left untouched.
 */

export type DomainAccuracyStat = {
  domain: string;
  totalApproves: number;
  totalRejects: number;
  accuracy: number;
  sourceCount: number;
};

export type DomainRow = {
  domainPattern: string;
  defaultReliability: number;
  isBlocked: boolean;
  locked: boolean;
};

export type ReliabilityUpdate = {
  domainPattern: string;
  from: number;
  to: number;
  reviewCount: number;
  accuracy: number;
  isNew: boolean;
};

export type BlockSuggestion = {
  domainPattern: string;
  reviewCount: number;
  accuracy: number;
};

export type TuningOptions = {
  /** Minimum reviews before we adjust a domain's score. */
  minSample?: number;
  /** Max points a score can move in a single run. */
  maxStep?: number;
  /** Minimum reviews before suggesting a block. */
  blockMinSample?: number;
  /** Accuracy at or below which we suggest blocking. */
  blockAccuracyThreshold?: number;
};

const DEFAULTS: Required<TuningOptions> = {
  minSample: 10,
  maxStep: 10,
  blockMinSample: 8,
  blockAccuracyThreshold: 0.25,
};

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Pure planner: given accuracy stats and the existing domain rows, decide which
 * reliability scores to nudge and which domains to suggest blocking. No I/O, so
 * it's fully unit-testable.
 */
export function computeDomainAdjustments(
  stats: DomainAccuracyStat[],
  existing: DomainRow[],
  options: TuningOptions = {}
): { updates: ReliabilityUpdate[]; blockSuggestions: BlockSuggestion[] } {
  const opts = { ...DEFAULTS, ...options };
  const byPattern = new Map(existing.map((d) => [d.domainPattern, d]));

  const updates: ReliabilityUpdate[] = [];
  const blockSuggestions: BlockSuggestion[] = [];

  for (const stat of stats) {
    const reviewCount = stat.totalApproves + stat.totalRejects;
    const row = byPattern.get(stat.domain);

    // Block suggestion: high volume, poor accuracy, not already blocked.
    if (
      reviewCount >= opts.blockMinSample &&
      stat.accuracy <= opts.blockAccuracyThreshold &&
      !row?.isBlocked
    ) {
      blockSuggestions.push({
        domainPattern: stat.domain,
        reviewCount,
        accuracy: stat.accuracy,
      });
    }

    // Score nudge: enough reviews, and the domain isn't locked or blocked.
    if (reviewCount < opts.minSample) continue;
    if (row?.locked || row?.isBlocked) continue;

    const current = row?.defaultReliability ?? 50;
    const target = Math.round(stat.accuracy * 100);
    if (target === current) continue;

    const delta = clamp(target - current, -opts.maxStep, opts.maxStep);
    const next = clamp(current + delta, 0, 100);
    if (next === current) continue;

    updates.push({
      domainPattern: stat.domain,
      from: current,
      to: next,
      reviewCount,
      accuracy: stat.accuracy,
      isNew: row === undefined,
    });
  }

  return { updates, blockSuggestions };
}

/**
 * Run one tuning pass: read stats + domain rows, compute bounded adjustments,
 * and persist them (creating a tracked row for a high-signal domain we didn't
 * have yet). Returns the audit of what changed and what to consider blocking.
 */
export async function applyDomainAutoTune(
  options: TuningOptions = {}
): Promise<{ updates: ReliabilityUpdate[]; blockSuggestions: BlockSuggestion[] }> {
  const [stats, rows] = await Promise.all([
    getDomainAccuracyStats(),
    prisma.domainReliability.findMany({
      select: {
        domainPattern: true,
        defaultReliability: true,
        isBlocked: true,
        locked: true,
      },
    }),
  ]);

  const { updates, blockSuggestions } = computeDomainAdjustments(
    stats,
    rows,
    options
  );

  for (const u of updates) {
    await prisma.domainReliability.upsert({
      where: { domainPattern: u.domainPattern },
      update: { defaultReliability: u.to },
      create: {
        domainPattern: u.domainPattern,
        defaultReliability: u.to,
        notes: "Auto-created by feedback tuning",
      },
    });
  }

  return { updates, blockSuggestions };
}
