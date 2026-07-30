"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CONDITION_LABELS,
  formatConditionAge,
  isConditionPinned,
  selectFeaturedCondition,
} from "@/lib/trail-conditions";
import type { TrailConditionReport } from "@/lib/trail-conditions";

interface TrailStatusBarProps {
  parkSlug: string;
}

/** Subtle border + tint + text per status color, for both themes. */
const BAR_CLASS: Record<string, string> = {
  green:
    "border-green-200 bg-green-50 text-green-800 dark:border-green-900 dark:bg-green-950/25 dark:text-green-300",
  red: "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/25 dark:text-red-300",
  yellow:
    "border-yellow-200 bg-yellow-50 text-yellow-800 dark:border-yellow-900 dark:bg-yellow-950/25 dark:text-yellow-300",
  amber:
    "border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900 dark:bg-amber-950/25 dark:text-amber-300",
  blue: "border-blue-200 bg-blue-50 text-blue-800 dark:border-blue-900 dark:bg-blue-950/25 dark:text-blue-300",
  sky: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900 dark:bg-sky-950/25 dark:text-sky-300",
};

const DOT_CLASS: Record<string, string> = {
  green: "bg-green-500",
  red: "bg-red-500",
  yellow: "bg-yellow-500",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  sky: "bg-sky-500",
};

/**
 * Compact, color-coded trail-status bar for the top of the park detail
 * Overview. Summarizes the single featured condition (see
 * `selectFeaturedCondition`) so a rider sees "is it rideable" without
 * scrolling. Stays quiet (neutral) when there are no recent reports; the full
 * report list + reporting form live in the rail's `TrailConditionsDisplay`
 * (anchored at #trail-conditions). Fetches independently of the rail display —
 * a second GET to the same cached endpoint.
 */
export function TrailStatusBar({ parkSlug }: TrailStatusBarProps) {
  const [conditions, setConditions] = useState<TrailConditionReport[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/parks/${parkSlug}/conditions`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelled && data) setConditions(data.conditions ?? []);
      })
      .catch(() => {
        /* non-critical — leave empty */
      })
      .finally(() => {
        if (!cancelled) setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [parkSlug]);

  // Avoid a layout flash before the first fetch resolves.
  if (!loaded) return null;

  const featured = selectFeaturedCondition(conditions);

  if (!featured) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm text-muted-foreground">
        <span
          className="h-2 w-2 shrink-0 rounded-full bg-muted-foreground/50"
          aria-hidden
        />
        <span>No recent trail condition reports.</span>
        <Link
          href="#trail-conditions"
          className="ml-auto shrink-0 text-xs font-medium text-primary hover:underline"
        >
          Report condition
        </Link>
      </div>
    );
  }

  const { label, color } = CONDITION_LABELS[featured.status];
  const pinned = isConditionPinned(featured.pinnedUntil);
  const who = featured.isOperatorPost
    ? " by the operator"
    : featured.user.name
      ? ` by ${featured.user.name}`
      : "";

  return (
    <div
      className={`flex items-center gap-2 rounded-lg border px-3 py-2 text-sm ${BAR_CLASS[color] ?? "border-border bg-card"}`}
    >
      <span
        className={`h-2 w-2 shrink-0 rounded-full ${DOT_CLASS[color] ?? "bg-muted-foreground"}`}
        aria-hidden
      />
      <span className="font-semibold">Trail status: {label}</span>
      <span className="hidden text-xs opacity-80 sm:inline">
        · {pinned ? "posted" : "reported"} {formatConditionAge(featured.createdAt)}
        {who}
      </span>
      {featured.note && (
        <span className="min-w-0 flex-1 truncate text-xs italic opacity-90">
          &ldquo;{featured.note}&rdquo;
        </span>
      )}
      <Link
        href="#trail-conditions"
        className={`shrink-0 text-xs font-medium hover:underline ${featured.note ? "" : "ml-auto"}`}
      >
        Report condition
      </Link>
    </div>
  );
}
