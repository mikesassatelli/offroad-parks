"use client";

import { useState } from "react";
import { Star, Mountain } from "lucide-react";
import { cn } from "@/lib/utils";

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  interactive?: boolean;
  onChange?: (rating: number) => void;
  className?: string;
}

export function StarRating({
  rating,
  maxRating = 5,
  size = "md",
  interactive = false,
  onChange,
  className,
}: StarRatingProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  const handleClick = (value: number) => {
    if (interactive && onChange) {
      onChange(value);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, value: number) => {
    if (interactive && onChange && (e.key === "Enter" || e.key === " ")) {
      e.preventDefault();
      onChange(value);
    }
  };

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: maxRating }, (_, index) => {
        const value = index + 1;
        const filled = value <= rating;
        const halfFilled = !filled && value - 0.5 <= rating;

        return (
          <button
            key={value}
            type="button"
            onClick={() => handleClick(value)}
            onKeyDown={(e) => handleKeyDown(e, value)}
            disabled={!interactive}
            className={cn(
              "relative",
              interactive && "cursor-pointer hover:scale-110 transition-transform",
              !interactive && "cursor-default"
            )}
            aria-label={`${value} star${value !== 1 ? "s" : ""}`}
            tabIndex={interactive ? 0 : -1}
          >
            <Star
              className={cn(
                sizeClasses[size],
                filled
                  ? "fill-yellow-400 text-yellow-400"
                  : halfFilled
                    ? "fill-yellow-400/50 text-yellow-400"
                    : "fill-none text-gray-300"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

interface StarRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  required?: boolean;
}

export function StarRatingInput({
  value,
  onChange,
  label,
  required = false,
}: StarRatingInputProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const sizeClasses = "h-5 w-5";

  return (
    <div className="space-y-1">
      {label && (
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHoverValue(0)}
      >
        {Array.from({ length: 5 }, (_, index) => {
          const ratingValue = index + 1;
          const filled = ratingValue <= (hoverValue || value);

          return (
            <button
              key={ratingValue}
              type="button"
              onClick={() => onChange(ratingValue)}
              onMouseEnter={() => setHoverValue(ratingValue)}
              className="cursor-pointer hover:scale-110 transition-transform"
              aria-label={`${ratingValue} star${ratingValue !== 1 ? "s" : ""}`}
            >
              <Star
                className={cn(
                  sizeClasses,
                  filled
                    ? "fill-yellow-400 text-yellow-400"
                    : "fill-none text-gray-300"
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Difficulty rating using mountain icons
interface DifficultyRatingProps {
  rating: number;
  maxRating?: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function DifficultyRating({
  rating,
  maxRating = 5,
  size = "md",
  className,
}: DifficultyRatingProps) {
  const sizeClasses = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <div className={cn("flex items-center gap-0.5", className)}>
      {Array.from({ length: maxRating }, (_, index) => {
        const value = index + 1;
        const filled = value <= rating;

        return (
          <Mountain
            key={value}
            className={cn(
              sizeClasses[size],
              filled
                ? "fill-orange-500 text-orange-500"
                : "fill-none text-gray-300"
            )}
          />
        );
      })}
    </div>
  );
}

interface DifficultyRatingInputProps {
  value: number;
  onChange: (value: number) => void;
  label?: string;
  required?: boolean;
}

export function DifficultyRatingInput({
  value,
  onChange,
  label,
  required = false,
}: DifficultyRatingInputProps) {
  const [hoverValue, setHoverValue] = useState(0);

  const sizeClasses = "h-5 w-5";

  return (
    <div className="space-y-1">
      {label && (
        <label className="text-sm font-medium">
          {label}
          {required && <span className="text-red-500 ml-1">*</span>}
        </label>
      )}
      <div
        className="flex items-center gap-1"
        onMouseLeave={() => setHoverValue(0)}
      >
        {Array.from({ length: 5 }, (_, index) => {
          const ratingValue = index + 1;
          const filled = ratingValue <= (hoverValue || value);

          return (
            <button
              key={ratingValue}
              type="button"
              onClick={() => onChange(ratingValue)}
              onMouseEnter={() => setHoverValue(ratingValue)}
              className="cursor-pointer hover:scale-110 transition-transform"
              aria-label={`${ratingValue} mountain${ratingValue !== 1 ? "s" : ""}`}
            >
              <Mountain
                className={cn(
                  sizeClasses,
                  filled
                    ? "fill-orange-500 text-orange-500"
                    : "fill-none text-gray-300"
                )}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
