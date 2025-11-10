import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { transformDbPark } from "@/lib/types";
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
          difficulty: true,
          amenities: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const favoritedParks = favorites
    .filter((f) => f.park.status === "APPROVED")
    .map((f) => transformDbPark(f.park));

  return <UserProfileClient parks={favoritedParks} user={session.user} />;
}
