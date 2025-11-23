"use client";

import { useState, useEffect } from "react";
import { PhotoGallery } from "@/components/parks/PhotoGallery";
import { PhotoUploadForm } from "@/components/parks/PhotoUploadForm";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { Park } from "@/lib/types";
import { Camera, MapPin, MessageSquare, Clock, CheckCircle } from "lucide-react";
import { SessionProvider, useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { ParkAttributesCards } from "./components/ParkAttributesCards";
import { ParkContactSidebar } from "./components/ParkContactSidebar";
import { ParkOverviewCard } from "./components/ParkOverviewCard";
import { CampingInfoCard } from "./components/CampingInfoCard";
import { ReviewList, ReviewForm, StarRating, DifficultyRating } from "@/components/reviews";
import { useReviews } from "@/hooks/useReviews";
import { useParkReview } from "@/hooks/useParkReview";
import { AppHeader } from "@/components/layout/AppHeader";

// Dynamically import map to avoid SSR issues
const MapView = dynamic(
  /* v8 ignore next */
  () => import("@/features/map/MapView").then((mod) => mod.MapView),
  { ssr: false },
);

interface Photo {
  id: string;
  url: string;
  caption: string | null;
  createdAt: Date;
  user: {
    name: string | null;
    email: string | null;
  } | null;
  userId: string | null;
}

interface ParkDetailPageProps {
  park: Park;
  photos: Photo[];
  currentUserId?: string;
  isAdmin?: boolean;
}

function ParkDetailPageInner({
  park,
  photos,
  currentUserId,
  isAdmin,
}: ParkDetailPageProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const [showReviewForm, setShowReviewForm] = useState(false);

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        // @ts-expect-error - role added in auth callback
        role: session.user.role,
      }
    : null;

  // Review hooks
  const { reviews, pagination, isLoading: reviewsLoading, setPage, refresh: refreshReviews } = useReviews({ parkSlug: park.id });
  const {
    userReview,
    isLoading: userReviewLoading,
    createReview,
    updateReview,
    deleteReview,
    loadUserReview,
  } = useParkReview(park.id);

  // Load user's review on mount
  useEffect(() => {
    if (session?.user) {
      loadUserReview();
    }
  }, [session?.user, loadUserReview]);

  const handlePhotoUploadSuccess = () => {
    router.refresh();
  };

  const handleReviewSubmit = async (data: Parameters<typeof createReview>[0]) => {
    let result;
    if (userReview) {
      result = await updateReview(data);
    } else {
      result = await createReview(data);
    }
    if (result.success) {
      setShowReviewForm(false);
      setPage(1);
      refreshReviews();
      loadUserReview();
    }
    return result;
  };

  const handleDeleteReview = async () => {
    if (confirm("Are you sure you want to delete your review?")) {
      const result = await deleteReview();
      if (result.success) {
        setPage(1);
        refreshReviews();
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-20">
        <AppHeader user={user} showBackButton />
      </div>

      {/* Park Title Section */}
      <div className="bg-card border-b border-border">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">
            {park.name}
          </h1>
          <div className="flex items-center gap-2 text-muted-foreground mt-2">
            <MapPin className="w-4 h-4" />
            <span>
              {park.address.city ? `${park.address.city}, ` : ""}
              {park.address.state}
            </span>
          </div>
          {(park.averageRating || park.averageDifficulty || park.averageTerrain || park.averageFacilities) && (
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-4">
              {park.averageRating && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Overall:</span>
                  <StarRating rating={park.averageRating} size="md" />
                </div>
              )}
              {park.averageTerrain && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Terrain:</span>
                  <StarRating rating={park.averageTerrain} size="md" />
                </div>
              )}
              {park.averageFacilities && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Facilities:</span>
                  <StarRating rating={park.averageFacilities} size="md" />
                </div>
              )}
              {park.averageDifficulty && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground">Difficulty:</span>
                  <DifficultyRating rating={Math.round(park.averageDifficulty)} size="md" />
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <ParkOverviewCard park={park} />
            <ParkAttributesCards park={park} />

            {/* Photo Gallery Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Photo Gallery ({photos.length})
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <PhotoGallery
                  photos={photos}
                  currentUserId={currentUserId}
                  isAdmin={isAdmin}
                />
              </CardContent>
            </Card>

            {/* Photo Upload Form - Only for authenticated users */}
            {session?.user && (
              <PhotoUploadForm
                parkSlug={park.id}
                onSuccess={handlePhotoUploadSuccess}
              />
            )}

            {/* Reviews Section */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="w-5 h-5" />
                    Reviews ({park.reviewCount || 0})
                  </CardTitle>
                  {session?.user && !userReview && !showReviewForm && (
                    <Button onClick={() => setShowReviewForm(true)} size="sm">
                      Write a Review
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* User's own review or form */}
                {session?.user && (showReviewForm || userReview) && (
                  <div className="border-b pb-6">
                    {showReviewForm ? (
                      <ReviewForm
                        initialData={userReview}
                        onSubmit={handleReviewSubmit}
                        onCancel={() => setShowReviewForm(false)}
                        isSubmitting={userReviewLoading}
                      />
                    ) : userReview ? (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-medium">Your Review</h4>
                          {userReview.status === "PENDING" ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                              <Clock className="w-3 h-3" />
                              Pending Approval
                            </span>
                          ) : userReview.status === "APPROVED" ? (
                            <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400">
                              <CheckCircle className="w-3 h-3" />
                              Approved
                            </span>
                          ) : null}
                        </div>
                        <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                          {/* Ratings */}
                          <div className="grid grid-cols-4 gap-2 text-xs">
                            <div>
                              <span className="text-muted-foreground">Overall</span>
                              <StarRating rating={userReview.overallRating} size="sm" />
                            </div>
                            <div>
                              <span className="text-muted-foreground">Terrain</span>
                              <StarRating rating={userReview.terrainRating} size="sm" />
                            </div>
                            <div>
                              <span className="text-muted-foreground">Facilities</span>
                              <StarRating rating={userReview.facilitiesRating} size="sm" />
                            </div>
                            <div>
                              <span className="text-muted-foreground">Difficulty</span>
                              <DifficultyRating rating={userReview.difficultyRating} size="sm" />
                            </div>
                          </div>

                          {/* Title */}
                          {userReview.title && (
                            <p className="font-medium text-sm">{userReview.title}</p>
                          )}

                          {/* Body */}
                          <p className="text-sm whitespace-pre-wrap">{userReview.body}</p>

                          {/* Actions */}
                          <div className="flex gap-2 pt-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setShowReviewForm(true)}
                            >
                              Edit Review
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={handleDeleteReview}
                            >
                              Delete
                            </Button>
                          </div>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* Reviews list */}
                {reviewsLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-32 bg-muted animate-pulse rounded" />
                    ))}
                  </div>
                ) : (
                  <ReviewList
                    reviews={reviews}
                    pagination={pagination}
                    onPageChange={setPage}
                  />
                )}
              </CardContent>
            </Card>

            {/* Map Card */}
            {park.coords && (
              <Card>
                <CardHeader>
                  <CardTitle>Location</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-96 rounded-lg overflow-hidden">
                    <MapView parks={[park]} />
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-20 space-y-6">
              <ParkContactSidebar park={park} />
              <CampingInfoCard park={park} />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

export function ParkDetailPage(props: ParkDetailPageProps) {
  return (
    <SessionProvider>
      <ParkDetailPageInner {...props} />
    </SessionProvider>
  );
}
