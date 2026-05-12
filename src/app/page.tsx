import UtvParksApp from "@/components/ui/OffroadParksApp";
import { prisma } from "@/lib/prisma";
import { resolveParkHeroImage } from "@/lib/park-hero";
import { transformDbPark } from "@/lib/types";
import { getBatchRainProbabilities } from "@/lib/weather";

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
          id: true,
          url: true,
          status: true,
        },
      },
      heroPhoto: {
        select: {
          id: true,
          url: true,
          status: true,
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

  // OP-55: batched fetch of today's rain probability for each park. Uses
  // the same forecast cache as OP-53 (6h TTL), so warm requests are
  // basically free. Per-park 2s timeout + concurrency cap bound the
  // first-render cost; parks that don't respond in time simply omit the
  // badge until the next render.
  const rainByParkId = await getBatchRainProbabilities(
    dbParks.map((p) => ({
      parkId: p.id,
      latitude: p.latitude ?? p.address?.latitude ?? null,
      longitude: p.longitude ?? p.address?.longitude ?? null,
    })),
  );

  // Transform to client format with hero images (respects operator selection)
  const parks = dbParks.map((park) => ({
    ...transformDbPark(park),
    heroImage: resolveParkHeroImage(park),
    todaysRainChance: rainByParkId.get(park.id) ?? null,
  }));

  return <UtvParksApp parks={parks} />;
}
