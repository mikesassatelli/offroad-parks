"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { ReviewModerationTable } from "@/components/admin/ReviewModerationTable";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Review, ReviewStatus } from "@/lib/types";

export default function AdminReviewsPage() {
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

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(
        `/api/admin/reviews?status=${status}&page=${page}&limit=20`
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
  }, [status, page]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  const handleStatusChange = (newStatus: string) => {
    router.push(`/admin/reviews?status=${newStatus}&page=1`);
  };

  const handlePageChange = (newPage: number) => {
    router.push(`/admin/reviews?status=${status}&page=${newPage}`);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Review Moderation</h1>
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
        />
      )}
    </div>
  );
}
