export type TrailConditionStatus =
  | "OPEN"
  | "CLOSED"
  | "CAUTION"
  | "MUDDY"
  | "WET"
  | "SNOW";

export type ConditionReportStatus = "PUBLISHED" | "PENDING_REVIEW";

export interface TrailConditionReport {
  id: string;
  parkId: string;
  userId: string;
  status: TrailConditionStatus;
  note: string | null;
  reportStatus: ConditionReportStatus;
  isOperatorPost: boolean;
  pinnedUntil: string | null; // ISO date string
  createdAt: string; // ISO date string
  user: {
    id: string;
    name: string | null;
    image: string | null;
  };
}

/** Staleness threshold: 72 hours in milliseconds */
export const CONDITION_STALE_AFTER_MS = 72 * 60 * 60 * 1000;

/**
 * Returns true if a condition report is still fresh (within 72 hours).
 */
export function isConditionFresh(createdAt: string | Date): boolean {
  const created = new Date(createdAt).getTime();
  return Date.now() - created < CONDITION_STALE_AFTER_MS;
}

/**
 * Returns true if an operator pin is currently active.
 */
export function isConditionPinned(pinnedUntil: string | Date | null): boolean {
  if (!pinnedUntil) return false;
  return new Date(pinnedUntil).getTime() > Date.now();
}

/**
 * Returns a human-readable age string for a condition report.
 * e.g. "just now", "2 hours ago", "3 days ago"
 */
export function formatConditionAge(createdAt: string | Date): string {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMins = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} minute${diffMins === 1 ? "" : "s"} ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? "" : "s"} ago`;
  return `${diffDays} day${diffDays === 1 ? "" : "s"} ago`;
}

/**
 * Pick the single most-relevant condition to feature (used by both the
 * top-of-page status bar and the rail display): an active operator pin, else
 * the most recent operator post, else the latest fresh report. Only fresh
 * (< 72h) or actively-pinned reports are considered. Returns null when none
 * qualify. Assumes `conditions` is newest-first (as the API returns them).
 */
export function selectFeaturedCondition(
  conditions: TrailConditionReport[],
): TrailConditionReport | null {
  const fresh = conditions.filter(
    (c) => isConditionFresh(c.createdAt) || isConditionPinned(c.pinnedUntil),
  );
  const activePin = fresh.find((c) => isConditionPinned(c.pinnedUntil)) ?? null;
  const recentOperatorPost = fresh.find((c) => c.isOperatorPost) ?? null;
  return activePin ?? recentOperatorPost ?? fresh[0] ?? null;
}

/** Display label and color variant per status */
export const CONDITION_LABELS: Record<
  TrailConditionStatus,
  { label: string; color: string }
> = {
  OPEN: { label: "Open", color: "green" },
  CLOSED: { label: "Closed", color: "red" },
  CAUTION: { label: "Caution", color: "yellow" },
  MUDDY: { label: "Muddy", color: "amber" },
  WET: { label: "Wet", color: "blue" },
  SNOW: { label: "Snow", color: "sky" },
};
