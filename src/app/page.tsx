import UtvParksApp from "@/components/ui/OffroadParksApp";
import { prisma } from "@/lib/prisma";
import { transformDbPark } from "@/lib/types";

export default async function Page() {
  // Fetch parks from database
  const dbParks = await prisma.park.findMany({
    where: {
      status: "APPROVED",
    },
    include: {
      terrain: true,
      difficulty: true,
      amenities: true,
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
    orderBy: {
      name: "asc",
    },
  });

  // Transform to client format with hero images
  const parks = dbParks.map((park) => ({
    ...transformDbPark(park),
    heroImage: park.photos[0]?.url || null,
  }));

  return <UtvParksApp parks={parks} />;
}
