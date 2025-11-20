"use client";

import { useState, useCallback } from "react";
import { useSession } from "next-auth/react";

interface UseHelpfulVoteReturn {
  toggleHelpful: (reviewId: string) => Promise<{
    success: boolean;
    hasVoted?: boolean;
    helpfulCount?: number;
  }>;
  isLoading: boolean;
}

export function useHelpfulVote(): UseHelpfulVoteReturn {
  const { data: session } = useSession();
  const [isLoading, setIsLoading] = useState(false);

  const toggleHelpful = useCallback(
    async (reviewId: string) => {
      if (!session?.user) {
        return { success: false };
      }

      setIsLoading(true);

      try {
        const response = await fetch(`/api/reviews/${reviewId}/helpful`, {
          method: "POST",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.error || "Failed to toggle vote");
        }

        return {
          success: true,
          hasVoted: result.hasVoted,
          helpfulCount: result.helpfulCount,
        };
      } catch {
        return { success: false };
      } finally {
        setIsLoading(false);
      }
    },
    [session?.user]
  );

  return {
    toggleHelpful,
    isLoading,
  };
}
