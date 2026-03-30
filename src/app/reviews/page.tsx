"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useRecentReviews } from "@/hooks/useReviews";
import { ReviewList } from "@/components/reviews";
import { AppHeader } from "@/components/layout/AppHeader";
import { SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { US_STATES } from "@/lib/constants";

const VEHICLE_TYPE_OPTIONS = [
  { value: "motorcycle", label: "Motorcycle" },
  { value: "atv", label: "ATV" },
  { value: "sxs", label: "SxS / UTV" },
  { value: "fullSize", label: "Full Size 4x4" },
];

const RATING_OPTIONS = [
  { value: "4", label: "4+ Stars" },
  { value: "3", label: "3+ Stars" },
  { value: "2", label: "2+ Stars" },
];

function RecentReviewsContent() {
  const { data: session } = useSession();
  const [showFilters, setShowFilters] = useState(false);
  const { reviews, isLoading, pagination, setPage, filters, setFilters, clearFilters } =
    useRecentReviews({ limit: 10 });

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: session.user.role,
      }
    : null;

  const hasActiveFilters = !!(filters.minRating || filters.vehicleType || filters.state);

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20">
        <AppHeader user={user} showBackButton />
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl font-bold">Recent Reviews</h1>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters((v) => !v)}
            className="flex items-center gap-2"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="ml-1 w-2 h-2 rounded-full bg-primary inline-block" />
            )}
          </Button>
        </div>
        <p className="text-muted-foreground mb-6">
          See what riders are saying about parks across the country
        </p>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-card border border-border rounded-lg p-4 mb-6 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Filter Reviews</span>
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  Clear all
                </button>
              )}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Min rating */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Minimum Rating
                </label>
                <select
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                  value={filters.minRating ?? ""}
                  onChange={(e) =>
                    setFilters({ ...filters, minRating: e.target.value || undefined })
                  }
                >
                  <option value="">Any rating</option>
                  {RATING_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Vehicle type */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Vehicle Type
                </label>
                <select
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                  value={filters.vehicleType ?? ""}
                  onChange={(e) =>
                    setFilters({ ...filters, vehicleType: e.target.value || undefined })
                  }
                >
                  <option value="">All vehicles</option>
                  {VEHICLE_TYPE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* State */}
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  State
                </label>
                <select
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                  value={filters.state ?? ""}
                  onChange={(e) =>
                    setFilters({ ...filters, state: e.target.value || undefined })
                  }
                >
                  <option value="">All states</option>
                  {US_STATES.map((state) => (
                    <option key={state} value={state}>
                      {state}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        <ReviewList
          reviews={reviews}
          isLoading={isLoading}
          pagination={pagination}
          onPageChange={setPage}
          showParkLink
          emptyMessage={
            hasActiveFilters
              ? "No reviews match your filters. Try adjusting your criteria."
              : "No reviews have been posted yet. Be the first to share your experience!"
          }
        />
      </main>
    </div>
  );
}

export default function RecentReviewsPage() {
  return (
    <SessionProvider>
      <RecentReviewsContent />
    </SessionProvider>
  );
}
