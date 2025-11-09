import { notFound } from "next/navigation";
import { PARKS } from "@/data/parks";
import { ParkDetailPage } from "@/features/parks/detail/ParkDetailPage";

interface ParkPageProps {
  params: Promise<{ id: string }>;
}

export async function generateStaticParams() {
  return PARKS.map((park) => ({
    id: park.id,
  }));
}

export async function generateMetadata({ params }: ParkPageProps) {
  const { id } = await params;
  const park = PARKS.find((p) => p.id === id);

  if (!park) {
    return {
      title: "Park Not Found",
    };
  }

  return {
    title: `${park.name} - UTV Parks`,
    description:
      park.notes ||
      `Information about ${park.name} in ${park.city ? `${park.city}, ` : ""}${park.state}`,
  };
}

export default async function ParkPage({ params }: ParkPageProps) {
  const { id } = await params;
  const park = PARKS.find((p) => p.id === id);

  if (!park) {
    notFound();
  }

  return <ParkDetailPage park={park} />;
}
