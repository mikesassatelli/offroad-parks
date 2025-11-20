"use client";

import { Star } from "lucide-react";
import { formatRating } from "@/lib/formatting";
import { cn } from "@/lib/utils";

interface RatingBadgeProps {
  rating?: number;
  reviewCount?: number;
  size?: "sm" | "md";
  showCount?: boolean;
  className?: string;
}

export function RatingBadge({
  rating,
  reviewCount = 0,
  size = "md",
  showCount = true,
  className,
}: RatingBadgeProps) {
  if (!rating && reviewCount === 0) {
    return (
      <span className={cn("text-muted-foreground text-xs", className)}>
        No reviews yet
      </span>
    );
  }

  const sizeClasses = {
    sm: "text-xs",
    md: "text-sm",
  };

  const starSizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
  };

  return (
    <div className={cn("flex items-center gap-1", sizeClasses[size], className)}>
      <Star className={cn(starSizeClasses[size], "fill-yellow-400 text-yellow-400")} />
      <span className="font-medium">
        {rating ? formatRating(rating) : "—"}
      </span>
      {showCount && (
        <span className="text-muted-foreground">
          ({reviewCount})
        </span>
      )}
    </div>
  );
}
