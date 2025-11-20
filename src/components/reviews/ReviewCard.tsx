"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { ThumbsUp, Pencil, Trash2, Calendar, Car, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StarRating, DifficultyRating } from "./StarRating";
import { useHelpfulVote } from "@/hooks/useHelpfulVote";
import {
  formatDate,
  formatRelativeDate,
  formatVehicleType,
  formatVisitCondition,
  formatRecommendedDuration,
} from "@/lib/formatting";
import type { Review } from "@/lib/types";
import Link from "next/link";

interface ReviewCardProps {
  review: Review;
  onEdit?: () => void;
  onDelete?: () => void;
  showParkLink?: boolean;
}

export function ReviewCard({
  review,
  onEdit,
  onDelete,
  showParkLink = false,
}: ReviewCardProps) {
  const { data: session } = useSession();
  const { toggleHelpful, isLoading: isVoting } = useHelpfulVote();
  const [helpfulCount, setHelpfulCount] = useState(review.helpfulCount);
  const [hasVoted, setHasVoted] = useState(review.hasVotedHelpful ?? false);

  const isOwner = session?.user?.id === review.userId;
  const canVote = session?.user && !isOwner;

  const handleHelpfulClick = async () => {
    if (!canVote) return;

    const result = await toggleHelpful(review.id);
    if (result.success) {
      setHelpfulCount(result.helpfulCount ?? helpfulCount);
      setHasVoted(result.hasVoted ?? !hasVoted);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
              <User className="w-5 h-5 text-muted-foreground" />
            </div>
            <div>
              <div className="font-medium">{review.userName}</div>
              <div className="text-sm text-muted-foreground">
                {formatRelativeDate(review.createdAt)}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <StarRating rating={review.overallRating} size="sm" />
          </div>
        </div>

        {/* Park Link */}
        {showParkLink && review.parkName && review.parkSlug && (
          <Link
            href={`/parks/${review.parkSlug}`}
            className="text-sm text-primary hover:underline mb-3 block"
          >
            {review.parkName}, {review.parkState}
          </Link>
        )}

        {/* Title */}
        {review.title && (
          <h4 className="font-semibold mb-2">{review.title}</h4>
        )}

        {/* Body */}
        <p className="text-sm text-muted-foreground mb-4 whitespace-pre-wrap">
          {review.body}
        </p>

        {/* Detailed Ratings */}
        <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
          <div>
            <span className="text-muted-foreground">Terrain:</span>
            <div className="flex items-center gap-1">
              <StarRating rating={review.terrainRating} size="sm" />
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Facilities:</span>
            <div className="flex items-center gap-1">
              <StarRating rating={review.facilitiesRating} size="sm" />
            </div>
          </div>
          <div>
            <span className="text-muted-foreground">Difficulty:</span>
            <div className="flex items-center gap-1">
              <DifficultyRating rating={review.difficultyRating} size="sm" />
            </div>
          </div>
        </div>

        {/* Optional Info */}
        <div className="flex flex-wrap gap-2 mb-4">
          {review.visitDate && (
            <Badge variant="outline" className="text-xs">
              <Calendar className="h-3 w-3 mr-1" />
              Visited {formatDate(review.visitDate)}
            </Badge>
          )}
          {review.vehicleType && (
            <Badge variant="outline" className="text-xs">
              <Car className="h-3 w-3 mr-1" />
              {formatVehicleType(review.vehicleType)}
            </Badge>
          )}
          {review.visitCondition && (
            <Badge variant="outline" className="text-xs">
              {formatVisitCondition(review.visitCondition)} conditions
            </Badge>
          )}
          {review.recommendedDuration && (
            <Badge variant="outline" className="text-xs">
              {formatRecommendedDuration(review.recommendedDuration)}
            </Badge>
          )}
        </div>

        {/* Recommended For */}
        {review.recommendedFor && (
          <p className="text-sm text-muted-foreground mb-4">
            <span className="font-medium">Recommended for:</span> {review.recommendedFor}
          </p>
        )}

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <Button
            variant={hasVoted ? "secondary" : "ghost"}
            size="sm"
            onClick={handleHelpfulClick}
            disabled={!canVote || isVoting}
            className="gap-2"
          >
            <ThumbsUp className={`h-4 w-4 ${hasVoted ? "fill-current" : ""}`} />
            Helpful ({helpfulCount})
          </Button>

          {isOwner && (
            <div className="flex gap-2">
              {onEdit && (
                <Button variant="ghost" size="sm" onClick={onEdit}>
                  <Pencil className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onDelete}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              )}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
