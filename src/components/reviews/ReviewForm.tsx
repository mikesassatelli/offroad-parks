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
import { Image as ImageIcon, X } from "lucide-react";
import Image from "next/image";
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
import { MAX_REVIEW_PHOTOS, type ReviewFormData } from "@/hooks/useParkReview";
import type { Review, VehicleType, VisitCondition, RecommendedDuration } from "@/lib/types";

const ALLOWED_PHOTO_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];
const MAX_PHOTO_SIZE = 5 * 1024 * 1024; // 5MB

interface SelectedPhoto {
  file: File;
  preview: string;
}

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

  const [photos, setPhotos] = useState<SelectedPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    // Reset the input so selecting the same file again re-triggers onChange.
    e.target.value = "";
    if (selected.length === 0) return;

    setPhotoError(null);

    let nextPhotos = [...photos];
    for (const file of selected) {
      if (nextPhotos.length >= MAX_REVIEW_PHOTOS) {
        setPhotoError(`You can attach up to ${MAX_REVIEW_PHOTOS} photos.`);
        break;
      }
      if (!ALLOWED_PHOTO_TYPES.includes(file.type)) {
        setPhotoError(
          "Invalid file type. Only JPEG, PNG, and WebP images are allowed.",
        );
        continue;
      }
      if (file.size > MAX_PHOTO_SIZE) {
        setPhotoError("File too large. Maximum size is 5MB.");
        continue;
      }

      const entry: SelectedPhoto = { file, preview: "" };
      nextPhotos = [...nextPhotos, entry];

      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotos((current) =>
          current.map((p) =>
            p.file === file ? { ...p, preview: reader.result as string } : p,
          ),
        );
      };
      reader.readAsDataURL(file);
    }

    setPhotos(nextPhotos);
  };

  const handleRemovePhoto = (index: number) => {
    setPhotos((current) => current.filter((_, i) => i !== index));
    setPhotoError(null);
  };

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

    const result = await onSubmit({
      ...formData,
      photos: photos.map((p) => p.file),
    });
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

          {/* Photos */}
          <div className="space-y-2">
            <Label htmlFor="review-photos">
              Photos (optional)
            </Label>
            <p className="text-xs text-muted-foreground">
              Attach up to {MAX_REVIEW_PHOTOS} photos (JPG, PNG, or WebP, max 5MB
              each). Photos are added to the park gallery after approval.
            </p>

            {photos.length > 0 && (
              <div className="grid grid-cols-4 gap-2">
                {photos.map((photo, index) => (
                  <div
                    key={index}
                    className="relative aspect-square rounded-md overflow-hidden border border-border"
                  >
                    {photo.preview && (
                      <Image
                        src={photo.preview}
                        alt={`Review photo ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    )}
                    <button
                      type="button"
                      aria-label={`Remove photo ${index + 1}`}
                      onClick={() => handleRemovePhoto(index)}
                      className="absolute top-1 right-1 bg-destructive text-destructive-foreground p-0.5 rounded-full hover:bg-destructive/90"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {photos.length < MAX_REVIEW_PHOTOS && (
              <label
                htmlFor="review-photos"
                className="mt-2 flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-border rounded-lg cursor-pointer hover:border-primary transition-colors"
              >
                <ImageIcon className="w-6 h-6 mb-1 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  Click to add photos
                </span>
                <input
                  id="review-photos"
                  type="file"
                  multiple
                  className="hidden"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  onChange={handlePhotoChange}
                />
              </label>
            )}

            {photoError && (
              <p className="text-sm text-destructive">{photoError}</p>
            )}
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
