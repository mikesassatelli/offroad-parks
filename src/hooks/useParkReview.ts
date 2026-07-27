"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";
import type { Review, VehicleType, VisitCondition, RecommendedDuration } from "@/lib/types";

// Maximum number of photos a user may attach to a single review. Kept small so
// the moderation queue isn't flooded from one submission.
export const MAX_REVIEW_PHOTOS = 4;

export interface ReviewFormData {
  overallRating: number;
  terrainRating: number;
  facilitiesRating: number;
  difficultyRating: number;
  title?: string;
  body: string;
  visitDate?: string;
  vehicleType?: VehicleType;
  visitCondition?: VisitCondition;
  recommendedDuration?: RecommendedDuration;
  recommendedFor?: string;
  // Optional photos attached to the review. These are uploaded to the existing
  // park photo endpoint (creating PENDING ParkPhoto rows credited to the user),
  // so they flow through the standard photo-moderation queue and public gallery.
  photos?: File[];
}

/**
 * Uploads review photos to the existing park photo endpoint. Each file becomes a
 * PENDING ParkPhoto row (for non-admins) credited to the signed-in user, so they
 * flow through the standard moderation queue. Failures are swallowed per-file so
 * a photo hiccup never fails an otherwise-successful review submission.
 */
async function uploadReviewPhotos(
  parkSlug: string,
  photos: File[],
): Promise<void> {
  const files = photos.slice(0, MAX_REVIEW_PHOTOS);
  await Promise.all(
    files.map(async (file) => {
      try {
        const formData = new FormData();
        formData.append("file", file);
        await fetch(`/api/parks/${parkSlug}/photos`, {
          method: "POST",
          body: formData,
        });
      } catch {
        // Ignore individual photo upload failures; the review itself succeeded.
      }
    }),
  );
}

interface UseParkReviewReturn {
  userReview: Review | null;
  isLoading: boolean;
  isSubmitting: boolean;
  error: string | null;
  createReview: (data: ReviewFormData) => Promise<{ success: boolean; message?: string }>;
  updateReview: (data: ReviewFormData) => Promise<{ success: boolean; message?: string }>;
  deleteReview: () => Promise<{ success: boolean }>;
  loadUserReview: () => Promise<void>;
}

export function useParkReview(parkSlug: string): UseParkReviewReturn {
  const { data: session } = useSession();
  const [userReview, setUserReview] = useState<Review | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadUserReview = useCallback(async () => {
    if (!session?.user) {
      setUserReview(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/reviews/user");
      if (!response.ok) {
        throw new Error("Failed to fetch user reviews");
      }

      const data = await response.json();
      // Find the review for this specific park
      const review = data.reviews.find(
        (r: Review) => r.parkSlug === parkSlug
      );
      setUserReview(review || null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
      setUserReview(null);
    } finally {
      setIsLoading(false);
    }
  }, [session?.user, parkSlug]);

  const createReview = useCallback(
    async (data: ReviewFormData) => {
      if (!session?.user) {
        return { success: false, message: "Please sign in to submit a review" };
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const { photos, ...reviewData } = data;

        const response = await fetch(`/api/parks/${parkSlug}/reviews`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reviewData),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to create review");
        }

        if (photos && photos.length > 0) {
          await uploadReviewPhotos(parkSlug, photos);
        }

        setUserReview(result.review);
        return { success: true, message: result.message };
      } catch (err) {
        const message = err instanceof Error ? err.message : "An error occurred";
        setError(message);
        return { success: false, message };
      } finally {
        setIsSubmitting(false);
      }
    },
    [session?.user, parkSlug]
  );

  const updateReview = useCallback(
    async (data: ReviewFormData) => {
      if (!session?.user || !userReview) {
        return { success: false, message: "No review to update" };
      }

      setIsSubmitting(true);
      setError(null);

      try {
        const { photos, ...reviewData } = data;

        const response = await fetch(`/api/reviews/${userReview.id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(reviewData),
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to update review");
        }

        if (photos && photos.length > 0) {
          await uploadReviewPhotos(parkSlug, photos);
        }

        setUserReview(result.review);
        return { success: true, message: result.message };
      } catch (err) {
        const message = err instanceof Error ? err.message : "An error occurred";
        setError(message);
        return { success: false, message };
      } finally {
        setIsSubmitting(false);
      }
    },
    [session?.user, userReview, parkSlug]
  );

  const deleteReview = useCallback(async () => {
    if (!session?.user || !userReview) {
      return { success: false };
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/reviews/${userReview.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error || "Failed to delete review");
      }

      setUserReview(null);
      return { success: true };
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
      return { success: false };
    } finally {
      setIsSubmitting(false);
    }
  }, [session?.user, userReview]);

  return {
    userReview,
    isLoading,
    isSubmitting,
    error,
    createReview,
    updateReview,
    deleteReview,
    loadUserReview,
  };
}
