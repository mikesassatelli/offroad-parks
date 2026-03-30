import { CONDITION_LABELS } from "@/lib/trail-conditions";
import type { TrailConditionStatus } from "@/lib/trail-conditions";

const COLOR_CLASS: Record<string, string> = {
  green: "bg-green-100 text-green-800 border border-green-200",
  red: "bg-red-100 text-red-800 border border-red-200",
  yellow: "bg-yellow-100 text-yellow-800 border border-yellow-200",
  amber: "bg-amber-100 text-amber-800 border border-amber-200",
  blue: "bg-blue-100 text-blue-800 border border-blue-200",
  sky: "bg-sky-100 text-sky-800 border border-sky-200",
};

interface ConditionBadgeProps {
  status: TrailConditionStatus;
  size?: "sm" | "xs";
}

export function ConditionBadge({ status, size = "sm" }: ConditionBadgeProps) {
  const { label, color } = CONDITION_LABELS[status];
  const sizeClass = size === "xs"
    ? "text-[10px] px-1.5 py-0.5"
    : "text-xs px-2 py-0.5";

  return (
    <span
      className={`inline-flex items-center rounded-full font-medium ${sizeClass} ${COLOR_CLASS[color]}`}
    >
      {label}
    </span>
  );
}
