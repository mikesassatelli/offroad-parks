"use client";

import {
  ReviewModerationTable as SharedReviewModerationTable,
} from "@/components/moderation/ReviewModerationTable";
import type { Review } from "@/lib/types";

interface ReviewModerationTableProps {
  reviews: Review[];
  pagination: {
    page: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
}

export function ReviewModerationTable({
  reviews,
  pagination,
  onPageChange,
}: ReviewModerationTableProps) {
  return (
    <SharedReviewModerationTable
      reviews={reviews}
      pagination={pagination}
      onPageChange={onPageChange}
      actions={{
        approve: (id) =>
          fetch(`/api/admin/reviews/${id}/approve`, { method: "POST" }),
        hide: (id) =>
          fetch(`/api/admin/reviews/${id}/hide`, { method: "POST" }),
        restore: (id) =>
          fetch(`/api/admin/reviews/${id}/restore`, { method: "POST" }),
        delete: (id) =>
          fetch(`/api/admin/reviews/${id}`, { method: "DELETE" }),
      }}
    />
  );
}
