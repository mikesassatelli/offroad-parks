import { redirect } from "next/navigation";
import { getOperatorContext } from "@/lib/operator-auth";
import { prisma } from "@/lib/prisma";
import { transformDbPark } from "@/lib/types";
import { ParkCardSelectorClient } from "./ParkCardSelectorClient";

interface ParkCardPageProps {
  params: Promise<{ parkSlug: string }>;
}

export default async function OperatorParkCardPage({ params }: ParkCardPageProps) {
  const { parkSlug } = await params;
  const ctx = await getOperatorContext(parkSlug);
  if (!ctx) redirect("/");

  const park = await prisma.park.findUnique({
    where: { id: ctx.parkId },
    include: {
      terrain: true,
      amenities: true,
      camping: true,
      vehicleTypes: true,
      address: true,
      photos: {
        where: { status: "APPROVED" },
        orderBy: { createdAt: "desc" },
        select: { id: true, url: true, caption: true, status: true },
      },
    },
  });

  if (!park) redirect("/");

  // Shape a Park for preview; transformDbPark drops photo data, so we'll
  // pass through heroImage / approved photos separately.
  const previewPark = transformDbPark({
    ...park,
    photos: park.photos,
  });

  const approvedPhotos = park.photos.map((p) => ({
    id: p.id,
    url: p.url,
    caption: p.caption ?? null,
  }));

  return (
    <ParkCardSelectorClient
      parkSlug={parkSlug}
      previewPark={previewPark}
      approvedPhotos={approvedPhotos}
      initialHeroSource={park.heroSource}
      initialHeroPhotoId={park.heroPhotoId}
    />
  );
}
