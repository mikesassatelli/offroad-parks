"use client";

import { Mountain } from "lucide-react";
import { formatRating } from "@/lib/formatting";
import { cn } from "@/lib/utils";

interface DifficultyBadgeProps {
  difficulty?: number;
  size?: "sm" | "md";
  className?: string;
}

export function DifficultyBadge({
  difficulty,
  size = "md",
  className,
}: DifficultyBadgeProps) {
  if (!difficulty) {
    return null;
  }

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
  };

  const iconSizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
  };

  return (
    <div className={cn("flex items-center gap-1", sizeClasses[size], className)}>
      <Mountain className={cn(iconSizeClasses[size], "fill-orange-500 text-orange-500")} />
      <span className="font-medium">
        {formatRating(difficulty)}
      </span>
    </div>
  );
}
