/**
 * Today's rain-likelihood badge on park cards (OP-55). Color-coded by
 * probability: green < 20%, amber 20–60%, red > 60%. Hidden when the
 * probability is null (no forecast yet / outside NWS coverage / timed out).
 */
import { Droplets } from "lucide-react";

interface RainBadgeProps {
  /** 0–100, or null to hide. */
  probability: number | null | undefined;
}

function colorFor(p: number): {
  bg: string;
  text: string;
  ring: string;
  iconColor: string;
} {
  if (p < 20) {
    return {
      bg: "bg-green-100 dark:bg-green-900/60",
      text: "text-green-900 dark:text-green-100",
      ring: "ring-green-200/60 dark:ring-green-800/60",
      iconColor: "text-green-700 dark:text-green-300",
    };
  }
  if (p <= 60) {
    return {
      bg: "bg-amber-100 dark:bg-amber-900/60",
      text: "text-amber-900 dark:text-amber-100",
      ring: "ring-amber-200/60 dark:ring-amber-800/60",
      iconColor: "text-amber-700 dark:text-amber-300",
    };
  }
  return {
    bg: "bg-red-100 dark:bg-red-900/60",
    text: "text-red-900 dark:text-red-100",
    ring: "ring-red-200/60 dark:ring-red-800/60",
    iconColor: "text-red-700 dark:text-red-300",
  };
}

export function RainBadge({ probability }: RainBadgeProps) {
  if (probability == null) return null;
  const c = colorFor(probability);
  return (
    <div
      data-testid="rain-badge"
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium shadow-sm ring-1 ${c.bg} ${c.text} ${c.ring}`}
      aria-label={`${probability}% chance of rain today`}
      title={`${probability}% chance of rain today`}
    >
      <Droplets className={`w-3 h-3 ${c.iconColor}`} aria-hidden="true" />
      <span className="tabular-nums">{probability}%</span>
    </div>
  );
}
