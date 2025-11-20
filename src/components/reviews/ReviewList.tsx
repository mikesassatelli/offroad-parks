"use client";

import { ReviewCard } from "./ReviewCard";
import { Pagination } from "@/components/shared/Pagination";
import type { Review } from "@/lib/types";

interface ReviewListProps {
  reviews: Review[];
  isLoading?: boolean;
  pagination?: {
    page: number;
    totalPages: number;
  };
  onPageChange?: (page: number) => void;
  onEdit?: (review: Review) => void;
  onDelete?: (review: Review) => void;
  showParkLink?: boolean;
  emptyMessage?: string;
}

export function ReviewList({
  reviews,
  isLoading = false,
  pagination,
  onPageChange,
  onEdit,
  onDelete,
  showParkLink = false,
  emptyMessage = "No reviews yet",
}: ReviewListProps) {
  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-48 bg-muted animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reviews.map((review) => (
        <ReviewCard
          key={review.id}
          review={review}
          onEdit={onEdit ? () => onEdit(review) : undefined}
          onDelete={onDelete ? () => onDelete(review) : undefined}
          showParkLink={showParkLink}
        />
      ))}

      {pagination && onPageChange && pagination.totalPages > 1 && (
        <div className="pt-4">
          <Pagination
            page={pagination.page}
            totalPages={pagination.totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
