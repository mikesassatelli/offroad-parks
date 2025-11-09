import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { transformDbPark } from "@/lib/types";
import { ParkDetailPage } from "@/features/parks/detail/ParkDetailPage";

interface ParkPageProps {
  params: Promise<{ id: string }>;
}

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

  const dbPark = await prisma.park.findUnique({
    where: {
      slug: id,
      status: "APPROVED",
    },
    include: {
      terrain: true,
      difficulty: true,
      amenities: true,
    },
  });

  if (!dbPark) {
    notFound();
  }

  const park = transformDbPark(dbPark);

  return <ParkDetailPage park={park} />;
}
