import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { transformDbPark } from "@/lib/types";
import { ParkDetailPage } from "@/features/parks/detail/ParkDetailPage";
import { auth } from "@/lib/auth";

interface ParkPageProps {
  params: Promise<{ id: string }>;
}

/* v8 ignore next - tested via E2E */
export async function generateStaticParams() {
  const parks = await prisma.park.findMany({
    where: {
      status: "APPROVED",
    },
    select: {
      slug: true,
    },
  });

  return parks.map((park) => ({
    id: park.slug,
  }));
}

export async function generateMetadata({ params }: ParkPageProps) {
  const { id } = await params;

  const dbPark = await prisma.park.findUnique({
    where: {
      slug: id,
      status: "APPROVED",
    },
    include: {
      terrain: true,
      difficulty: true,
      amenities: true,
      vehicleTypes: true,
    },
  });

  if (!dbPark) {
    return {
      title: "Park Not Found",
    };
  }

  const park = transformDbPark(dbPark);

  return {
    title: `${park.name} - UTV Parks`,
    description:
      park.notes ||
      `Information about ${park.name} in ${park.city ? `${park.city}, ` : ""}${park.state}`,
  };
}

export default async function ParkPage({ params }: ParkPageProps) {
  const { id } = await params;
  const session = await auth();

  const dbPark = await prisma.park.findUnique({
    where: {
      slug: id,
      status: "APPROVED",
    },
    include: {
      terrain: true,
      difficulty: true,
      amenities: true,
      vehicleTypes: true,
    },
  });

  if (!dbPark) {
    notFound();
  }

  // Fetch approved photos for this park
  const photos = await prisma.parkPhoto.findMany({
    where: {
      parkId: dbPark.id,
      status: "APPROVED",
    },
    include: {
      user: {
        select: {
          name: true,
          email: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  const park = transformDbPark(dbPark);

  const userRole = (session?.user as { role?: string })?.role;
  const isAdmin = userRole === "ADMIN";

  return (
    <ParkDetailPage
      park={park}
      photos={photos}
      currentUserId={session?.user?.id}
      isAdmin={isAdmin}
    />
  );
}
