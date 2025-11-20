"use client";

import { Star } from "lucide-react";
import { formatRating } from "@/lib/formatting";

interface ReviewSummaryProps {
  averageRating?: number;
  reviewCount: number;
}

export function ReviewSummary({ averageRating, reviewCount }: ReviewSummaryProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex items-center gap-2">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-5 w-5 ${
                averageRating && star <= Math.round(averageRating)
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-none text-gray-300"
              }`}
            />
          ))}
        </div>
        {averageRating ? (
          <span className="font-semibold text-lg">
            {formatRating(averageRating)}
          </span>
        ) : (
          <span className="text-muted-foreground">No ratings yet</span>
        )}
      </div>
      <span className="text-muted-foreground">
        {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
      </span>
    </div>
  );
}
