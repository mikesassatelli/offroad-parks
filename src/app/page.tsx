import UtvParksApp from "@/components/ui/OffroadParksApp";
import { prisma } from "@/lib/prisma";
import { transformDbPark } from "@/lib/types";

// Force dynamic rendering to always show fresh data
export const dynamic = "force-dynamic";

export default async function Page() {
  // Fetch parks from database
  const dbParks = await prisma.park.findMany({
    where: {
      status: "APPROVED",
    },
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
      // Latest published trail condition — drives the condition badge on
      // the card. Without this, `park.latestCondition` is undefined on the
      // home grid and the badge never renders (bug pre-dated OP-90).
      trailConditions: {
        where: { reportStatus: "PUBLISHED" },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          status: true,
          reportStatus: true,
          createdAt: true,
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
