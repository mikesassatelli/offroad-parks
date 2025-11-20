"use client";

import { useState, useEffect, useCallback } from "react";
import type { Review } from "@/lib/types";

interface UseReviewsOptions {
  parkSlug?: string;
  initialPage?: number;
  limit?: number;
}

interface UseReviewsReturn {
  reviews: Review[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  setPage: (page: number) => void;
  refresh: () => void;
}

export function useReviews({
  parkSlug,
  initialPage = 1,
  limit = 10,
}: UseReviewsOptions): UseReviewsReturn {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit,
    total: 0,
    totalPages: 0,
  });

  const fetchReviews = useCallback(async () => {
    if (!parkSlug) {
      setReviews([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/parks/${parkSlug}/reviews?page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch reviews");
      }

      const data = await response.json();
      setReviews(data.reviews);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [parkSlug, page, limit]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return {
    reviews,
    isLoading,
    error,
    pagination,
    setPage,
    refresh: fetchReviews,
  };
}

// Hook for fetching recent reviews across all parks
export function useRecentReviews({
  initialPage = 1,
  limit = 10,
}: Omit<UseReviewsOptions, "parkSlug">): UseReviewsReturn {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(initialPage);
  const [pagination, setPagination] = useState({
    page: initialPage,
    limit,
    total: 0,
    totalPages: 0,
  });

  const fetchReviews = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(
        `/api/reviews/recent?page=${page}&limit=${limit}`
      );

      if (!response.ok) {
        throw new Error("Failed to fetch reviews");
      }

      const data = await response.json();
      setReviews(data.reviews);
      setPagination(data.pagination);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setReviews([]);
    } finally {
      setIsLoading(false);
    }
  }, [page, limit]);

  useEffect(() => {
    fetchReviews();
  }, [fetchReviews]);

  return {
    reviews,
    isLoading,
    error,
    pagination,
    setPage,
    refresh: fetchReviews,
  };
}
