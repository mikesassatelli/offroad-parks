"use client";

import { SessionProvider, useSession } from "next-auth/react";
import { useRecentReviews } from "@/hooks/useReviews";
import { ReviewList } from "@/components/reviews";
import { AppHeader } from "@/components/layout/AppHeader";

function RecentReviewsContent() {
  const { data: session } = useSession();
  const { reviews, isLoading, pagination, setPage } = useRecentReviews({
    limit: 10,
  });

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        // @ts-expect-error - role added in auth callback
        role: session.user.role,
      }
    : null;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 z-20">
        <AppHeader user={user} showBackButton />
      </div>

      <main className="max-w-4xl mx-auto px-6 py-8">
        <h1 className="text-3xl font-bold mb-2">Recent Reviews</h1>
        <p className="text-muted-foreground mb-8">
          See what riders are saying about parks across the country
        </p>

        <ReviewList
          reviews={reviews}
          isLoading={isLoading}
          pagination={pagination}
          onPageChange={setPage}
          showParkLink
          emptyMessage="No reviews have been posted yet. Be the first to share your experience!"
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
