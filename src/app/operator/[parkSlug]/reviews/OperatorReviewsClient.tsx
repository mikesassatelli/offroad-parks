"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ReviewModerationTable } from "@/components/moderation/ReviewModerationTable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Review, ReviewStatus } from "@/lib/types";

interface OperatorReviewsClientProps {
  parkSlug: string;
}

export function OperatorReviewsClient({ parkSlug }: OperatorReviewsClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  const status = (searchParams.get("status") as ReviewStatus) || "PENDING";
  const page = parseInt(searchParams.get("page") || "1");

  const apiBase = `/api/operator/parks/${parkSlug}/reviews`;

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `${apiBase}?status=${status}&page=${page}&limit=20`,
      );
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews);
        setPagination({
          page: data.pagination.page,
          totalPages: data.pagination.totalPages,
          total: data.pagination.total,
        });
      }
    } catch (error) {
      console.error("Error fetching reviews:", error);
    } finally {
      setIsLoading(false);
    }
  }, [apiBase, status, page]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleStatusChange = (newStatus: string) => {
    router.push(`/operator/${parkSlug}/reviews?status=${newStatus}&page=1`);
  };

  const handlePageChange = (newPage: number) => {
    router.push(`/operator/${parkSlug}/reviews?status=${status}&page=${newPage}`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <span className="text-sm text-muted-foreground">
          {pagination.total} total reviews
        </span>
      </div>

      <Tabs value={status} onValueChange={handleStatusChange} className="mb-6">
        <TabsList>
          <TabsTrigger value="PENDING">Pending</TabsTrigger>
          <TabsTrigger value="APPROVED">Approved</TabsTrigger>
          <TabsTrigger value="HIDDEN">Hidden</TabsTrigger>
        </TabsList>
      </Tabs>

      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-muted animate-pulse rounded" />
          ))}
        </div>
      ) : (
        <ReviewModerationTable
          reviews={reviews}
          pagination={pagination}
          onPageChange={handlePageChange}
          showParkColumn={false}
          actions={{
            approve: (id) =>
              fetch(`${apiBase}/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "APPROVED" }),
              }),
            hide: (id) =>
              fetch(`${apiBase}/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "HIDDEN" }),
              }),
            restore: (id) =>
              fetch(`${apiBase}/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ status: "APPROVED" }),
              }),
          }}
        />
      )}
    </div>
  );
}
