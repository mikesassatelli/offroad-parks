"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StarRatingInput, DifficultyRatingInput } from "./StarRating";
import {
  ALL_VISIT_CONDITIONS,
  ALL_RECOMMENDED_DURATIONS,
  ALL_VEHICLE_TYPES,
} from "@/lib/constants";
import {
  formatVisitCondition,
  formatRecommendedDuration,
  formatVehicleType,
} from "@/lib/formatting";
import type { ReviewFormData } from "@/hooks/useParkReview";
import type { Review, VehicleType, VisitCondition, RecommendedDuration } from "@/lib/types";

interface ReviewFormProps {
  initialData?: Review | null;
  onSubmit: (data: ReviewFormData) => Promise<{ success: boolean; message?: string }>;
  onCancel?: () => void;
  isSubmitting?: boolean;
}

export function ReviewForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ReviewFormProps) {
  const getInitialFormData = (): ReviewFormData => ({
    overallRating: initialData?.overallRating || 0,
    terrainRating: initialData?.terrainRating || 0,
    facilitiesRating: initialData?.facilitiesRating || 0,
    difficultyRating: initialData?.difficultyRating || 0,
    title: initialData?.title || "",
    body: initialData?.body || "",
    visitDate: initialData?.visitDate?.split("T")[0] || "",
    vehicleType: initialData?.vehicleType,
    visitCondition: initialData?.visitCondition,
    recommendedDuration: initialData?.recommendedDuration,
    recommendedFor: initialData?.recommendedFor || "",
  });

  const [formData, setFormData] = useState<ReviewFormData>(getInitialFormData);

  const [errors, setErrors] = useState<string[]>([]);

  const validate = (): boolean => {
    const newErrors: string[] = [];

    if (!formData.overallRating) {
      newErrors.push("Overall rating is required");
    }
    if (!formData.terrainRating) {
      newErrors.push("Terrain rating is required");
    }
    if (!formData.facilitiesRating) {
      newErrors.push("Facilities rating is required");
    }
    if (!formData.difficultyRating) {
      newErrors.push("Difficulty rating is required");
    }
    if (!formData.body.trim()) {
      newErrors.push("Review body is required");
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const result = await onSubmit(formData);
    if (result.success && result.message) {
      alert(result.message);
    } else if (!result.success && result.message) {
      alert(result.message);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {initialData ? "Edit Your Review" : "Write a Review"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {errors.length > 0 && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md">
              <ul className="list-disc list-inside text-sm">
                {errors.map((error, index) => (
                  <li key={index}>{error}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Ratings */}
          <div className="grid grid-cols-2 gap-4">
            <StarRatingInput
              label="Overall Rating"
              value={formData.overallRating}
              onChange={(value) =>
                setFormData({ ...formData, overallRating: value })
              }
              required
            />
            <StarRatingInput
              label="Terrain Rating"
              value={formData.terrainRating}
              onChange={(value) =>
                setFormData({ ...formData, terrainRating: value })
              }
              required
            />
            <StarRatingInput
              label="Facilities Rating"
              value={formData.facilitiesRating}
              onChange={(value) =>
                setFormData({ ...formData, facilitiesRating: value })
              }
              required
            />
            <DifficultyRatingInput
              label="Difficulty Rating"
              value={formData.difficultyRating}
              onChange={(value) =>
                setFormData({ ...formData, difficultyRating: value })
              }
              required
            />
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Title (optional)</Label>
            <Input
              id="title"
              value={formData.title}
              onChange={(e) =>
                setFormData({ ...formData, title: e.target.value })
              }
              placeholder="Summarize your experience"
            />
          </div>

          {/* Body */}
          <div className="space-y-2">
            <Label htmlFor="body">
              Your Review <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="body"
              value={formData.body}
              onChange={(e) =>
                setFormData({ ...formData, body: e.target.value })
              }
              placeholder="Share your experience at this park..."
              rows={5}
            />
          </div>

          {/* Optional Fields */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="visitDate">Visit Date (optional)</Label>
              <Input
                id="visitDate"
                type="date"
                value={formData.visitDate}
                onChange={(e) =>
                  setFormData({ ...formData, visitDate: e.target.value })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="vehicleType">Vehicle Used (optional)</Label>
              <Select
                value={formData.vehicleType || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    vehicleType: value === "none" ? undefined : value as VehicleType,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vehicle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {ALL_VEHICLE_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>
                      {formatVehicleType(type)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="visitCondition">Trail Conditions (optional)</Label>
              <Select
                value={formData.visitCondition || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    visitCondition: value === "none" ? undefined : value as VisitCondition,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select conditions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {ALL_VISIT_CONDITIONS.map((condition) => (
                    <SelectItem key={condition} value={condition}>
                      {formatVisitCondition(condition)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="recommendedDuration">
                Recommended Duration (optional)
              </Label>
              <Select
                value={formData.recommendedDuration || "none"}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    recommendedDuration: value === "none" ? undefined : value as RecommendedDuration,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select duration" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {ALL_RECOMMENDED_DURATIONS.map((duration) => (
                    <SelectItem key={duration} value={duration}>
                      {formatRecommendedDuration(duration)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Recommended For */}
          <div className="space-y-2">
            <Label htmlFor="recommendedFor">Recommended For (optional)</Label>
            <Input
              id="recommendedFor"
              value={formData.recommendedFor}
              onChange={(e) =>
                setFormData({ ...formData, recommendedFor: e.target.value })
              }
              placeholder="e.g., Families, Experienced riders, Big rigs"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? "Submitting..."
                : initialData
                  ? "Update Review"
                  : "Submit Review"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
