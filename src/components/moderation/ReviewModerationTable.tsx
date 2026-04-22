"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { StarRating, DifficultyRating } from "@/components/reviews/StarRating";
import { Pagination } from "@/components/shared/Pagination";
import { formatDate, formatVehicleType, formatVisitCondition, formatRecommendedDuration } from "@/lib/formatting";
import type { Review } from "@/lib/types";
import Link from "next/link";
import { ChevronDown, ChevronUp } from "lucide-react";
import React from "react";

export type ReviewModerationAction = "approve" | "hide" | "restore" | "delete";

export type ReviewModerationActionHandlers = {
  approve: (reviewId: string) => Promise<Response>;
  hide: (reviewId: string) => Promise<Response>;
  restore: (reviewId: string) => Promise<Response>;
  delete?: (reviewId: string) => Promise<Response>;
};

export interface ReviewModerationTableProps {
  reviews: Review[];
  pagination: {
    page: number;
    totalPages: number;
  };
  onPageChange: (page: number) => void;
  actions: ReviewModerationActionHandlers;
  /** If true, show Park column. Defaults to true — the operator scoped view sets this to false. */
  showParkColumn?: boolean;
}

export function ReviewModerationTable({
  reviews,
  pagination,
  onPageChange,
  actions,
  showParkColumn = true,
}: ReviewModerationTableProps) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (reviewId: string) => {
    setExpandedId(expandedId === reviewId ? null : reviewId);
  };

  const handleAction = async (
    reviewId: string,
    action: ReviewModerationAction,
  ) => {
    const handler = actions[action];
    if (!handler) return;
    setProcessingId(reviewId);

    try {
      const response = await handler(reviewId);

      if (response.ok) {
        router.refresh();
      } else {
        alert(`Failed to ${action} review`);
      }
    } catch (error) {
      console.error(`Error ${action} review:`, error);
      alert(`Failed to ${action} review`);
    } finally {
      setProcessingId(null);
    }
  };

  const getActions = (review: Review) => {
    const isHidden = review.status === "HIDDEN";
    const isApproved = review.status === "APPROVED";

    return (
      <div className="flex gap-2">
        {!isApproved && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction(review.id, "approve")}
            disabled={processingId === review.id}
          >
            Approve
          </Button>
        )}
        {isHidden ? (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction(review.id, "restore")}
            disabled={processingId === review.id}
          >
            Restore
          </Button>
        ) : (
          <Button
            size="sm"
            variant="outline"
            onClick={() => handleAction(review.id, "hide")}
            disabled={processingId === review.id}
          >
            Hide
          </Button>
        )}
        {actions.delete && (
          <Button
            size="sm"
            variant="destructive"
            onClick={() => {
              if (confirm("Are you sure you want to permanently delete this review?")) {
                handleAction(review.id, "delete");
              }
            }}
            disabled={processingId === review.id}
          >
            Delete
          </Button>
        )}
      </div>
    );
  };

  if (reviews.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No reviews found
      </div>
    );
  }

  const colSpan = showParkColumn ? 6 : 5;

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10"></TableHead>
              {showParkColumn && <TableHead>Park</TableHead>}
              <TableHead>User</TableHead>
              <TableHead>Rating</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map((review) => (
              <React.Fragment key={review.id}>
                <TableRow>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleExpand(review.id)}
                      className="h-8 w-8 p-0"
                    >
                      {expandedId === review.id ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </Button>
                  </TableCell>
                  {showParkColumn && (
                    <TableCell>
                      {review.parkSlug ? (
                        <Link
                          href={`/parks/${review.parkSlug}`}
                          className="text-primary hover:underline"
                        >
                          {review.parkName}
                        </Link>
                      ) : (
                        review.parkName || "Unknown"
                      )}
                    </TableCell>
                  )}
                  <TableCell>{review.userName}</TableCell>
                  <TableCell>
                    <StarRating rating={review.overallRating} size="sm" />
                  </TableCell>
                  <TableCell>{formatDate(review.createdAt)}</TableCell>
                  <TableCell>{getActions(review)}</TableCell>
                </TableRow>
                {expandedId === review.id && (
                  <TableRow>
                    <TableCell colSpan={colSpan} className="bg-muted/50">
                      <div className="p-4 space-y-4">
                        <div className="grid grid-cols-4 gap-4">
                          <div>
                            <span className="text-xs text-muted-foreground">Overall</span>
                            <div className="flex items-center gap-1">
                              <StarRating rating={review.overallRating} size="sm" />
                            </div>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Terrain</span>
                            <div className="flex items-center gap-1">
                              <StarRating rating={review.terrainRating} size="sm" />
                            </div>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Facilities</span>
                            <div className="flex items-center gap-1">
                              <StarRating rating={review.facilitiesRating} size="sm" />
                            </div>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Difficulty</span>
                            <div className="flex items-center gap-1">
                              <DifficultyRating rating={review.difficultyRating} size="sm" />
                            </div>
                          </div>
                        </div>

                        {review.title && (
                          <div>
                            <span className="text-xs text-muted-foreground">Title</span>
                            <p className="font-medium">{review.title}</p>
                          </div>
                        )}

                        <div>
                          <span className="text-xs text-muted-foreground">Review</span>
                          <p className="whitespace-pre-wrap">{review.body}</p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          {review.visitDate && (
                            <div>
                              <span className="text-xs text-muted-foreground">Visit Date</span>
                              <p>{formatDate(review.visitDate)}</p>
                            </div>
                          )}
                          {review.vehicleType && (
                            <div>
                              <span className="text-xs text-muted-foreground">Vehicle</span>
                              <p>{formatVehicleType(review.vehicleType)}</p>
                            </div>
                          )}
                          {review.visitCondition && (
                            <div>
                              <span className="text-xs text-muted-foreground">Conditions</span>
                              <p>{formatVisitCondition(review.visitCondition)}</p>
                            </div>
                          )}
                          {review.recommendedDuration && (
                            <div>
                              <span className="text-xs text-muted-foreground">Duration</span>
                              <p>{formatRecommendedDuration(review.recommendedDuration)}</p>
                            </div>
                          )}
                        </div>

                        {review.recommendedFor && (
                          <div>
                            <span className="text-xs text-muted-foreground">Recommended For</span>
                            <p className="text-sm">{review.recommendedFor}</p>
                          </div>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {pagination.totalPages > 1 && (
        <Pagination
          page={pagination.page}
          totalPages={pagination.totalPages}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
