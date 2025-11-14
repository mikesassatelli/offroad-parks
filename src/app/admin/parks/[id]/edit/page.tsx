import { notFound, redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ParkSubmissionForm } from "@/components/forms/ParkSubmissionForm";

interface EditParkPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function EditParkPage({ params }: EditParkPageProps) {
  const session = await auth();

  // Check if user is authenticated and is an admin
  if (!session?.user) {
    redirect("/api/auth/signin");
  }

  // @ts-expect-error - role added in auth callback
  if (session.user.role !== "ADMIN") {
    redirect("/");
  }

  const { id } = await params;

  // Fetch park with all relations
  const park = await prisma.park.findUnique({
    where: { id },
    include: {
      terrain: true,
      difficulty: true,
      amenities: true,
      vehicleTypes: true,
      photos: {
        where: {
          status: "APPROVED",
        },
      },
    },
  });

  if (!park) {
    notFound();
  }

  // Transform park data to match form structure
  const initialData = {
    name: park.name,
    slug: park.slug,
    city: park.city || "",
    state: park.state,
    latitude: park.latitude?.toString() || "",
    longitude: park.longitude?.toString() || "",
    website: park.website || "",
    phone: park.phone || "",
    dayPassUSD: park.dayPassUSD?.toString() || "",
    milesOfTrails: park.milesOfTrails?.toString() || "",
    acres: park.acres?.toString() || "",
    notes: park.notes || "",
    submitterName: "",
    terrain: park.terrain.map((t) => t.terrain),
    difficulty: park.difficulty.map((d) => d.difficulty),
    amenities: park.amenities.map((a) => a.amenity),
    vehicleTypes: park.vehicleTypes.map((v) => v.vehicleType),
  };

  return (
    <div className="max-w-4xl mx-auto py-8 px-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Edit Park</h1>
        <p className="text-muted-foreground mt-2">
          Update information for {park.name}
        </p>
      </div>

      <ParkSubmissionForm
        isAdminForm={true}
        initialData={initialData}
        parkId={park.id}
        existingPhotoCount={park.photos.length}
      />
    </div>
  );
}
