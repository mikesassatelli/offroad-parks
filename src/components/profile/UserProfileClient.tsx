"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import type { Park, Review } from "@/lib/types";
import { ParkCard } from "@/components/parks/ParkCard";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { useFavorites } from "@/hooks/useFavorites";
import { Heart, User, MessageSquare } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/layout/AppHeader";

interface UserProfileClientProps {
  parks: Park[];
  reviews: Review[];
  user: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  };
}

function UserProfileInner({ parks, reviews, user }: UserProfileClientProps) {
  const router = useRouter();
  const { data: session } = useSession();
  const { toggleFavorite, isFavorite } = useFavorites();

  const headerUser = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        // @ts-expect-error - role added in auth callback
        role: session.user.role,
      }
    : null;

  const handleToggleFavorite = async (parkId: string) => {
    await toggleFavorite(parkId);
    // Refresh the page to update the server-side favorites list
    router.refresh();
  };

  const handleDeleteReview = async (reviewId: string) => {
    if (confirm("Are you sure you want to delete this review?")) {
      const response = await fetch(`/api/reviews/${reviewId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        router.refresh();
      } else {
        alert("Failed to delete review");
      }
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20">
        <AppHeader user={headerUser} showBackButton />
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <User className="w-8 h-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">
                {user.name || "My Profile"}
              </h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
          </div>
        </div>

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Heart className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">
              My Favorites
            </h2>
            <span className="text-sm text-muted-foreground">
              ({parks.length} park{parks.length !== 1 ? "s" : ""})
            </span>
          </div>

          {parks.length === 0 ? (
            <div className="bg-card rounded-lg shadow border border-border p-12 text-center">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No favorites yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Start exploring parks and add them to your favorites!
              </p>
              <Button asChild>
                <Link href="/">Browse Parks</Link>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {parks.map((park) => (
                <ParkCard
                  key={park.id}
                  park={park}
                  isFavorite={isFavorite(park.id)}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
        </div>

        {/* My Reviews Section */}
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-primary" />
            <h2 className="text-2xl font-semibold text-foreground">
              My Reviews
            </h2>
            <span className="text-sm text-muted-foreground">
              ({reviews.length} review{reviews.length !== 1 ? "s" : ""})
            </span>
          </div>

          {reviews.length === 0 ? (
            <div className="bg-card rounded-lg shadow border border-border p-12 text-center">
              <MessageSquare className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">
                No reviews yet
              </h3>
              <p className="text-muted-foreground mb-4">
                Share your experiences by reviewing parks you&apos;ve visited!
              </p>
              <Button asChild>
                <Link href="/">Browse Parks</Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {reviews.map((review) => (
                <ReviewCard
                  key={review.id}
                  review={review}
                  showParkLink={true}
                  onDelete={() => handleDeleteReview(review.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export function UserProfileClient(props: UserProfileClientProps) {
  return (
    <SessionProvider>
      <UserProfileInner {...props} />
    </SessionProvider>
  );
}
