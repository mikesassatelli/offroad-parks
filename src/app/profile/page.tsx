import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transformDbPark, transformDbReview } from "@/lib/types";
import type { DbReview } from "@/lib/types";
import { UserProfileClient } from "@/components/profile/UserProfileClient";

export default async function ProfilePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/api/auth/signin?callbackUrl=/profile");
  }

  // Fetch user's favorites with park details
  const favorites = await prisma.userFavorite.findMany({
    where: { userId: session.user.id },
    include: {
      park: {
        include: {
          terrain: true,
          amenities: true,
          camping: true,
          vehicleTypes: true,
          address: true,
          photos: {
            where: {
              status: "APPROVED",
            },
            take: 1,
            orderBy: {
              createdAt: "desc",
            },
            select: {
              url: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const favoritedParks = favorites
    .filter((f) => f.park.status === "APPROVED")
    .map((f) => ({
      ...transformDbPark(f.park),
      heroImage: f.park.photos[0]?.url || null,
    }));

  // Fetch user's reviews
  const userReviews = await prisma.parkReview.findMany({
    where: { userId: session.user.id },
    include: {
      user: {
        select: {
          id: true,
          name: true,
          image: true,
        },
      },
      park: {
        select: {
          id: true,
          name: true,
          slug: true,
          address: {
            select: {
              state: true,
            },
          },
        },
      },
      _count: {
        select: { helpfulVotes: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const reviews = userReviews.map((review) =>
    transformDbReview(review as DbReview, session.user?.id)
  );

  return <UserProfileClient parks={favoritedParks} reviews={reviews} user={session.user} />;
}
