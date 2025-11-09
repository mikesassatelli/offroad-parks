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
    },
    orderBy: {
      name: "asc",
    },
  });

  // Transform to client format
  const parks = dbParks.map(transformDbPark);

  return <UtvParksApp parks={parks} />;
}
