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
      amenities: true,
      camping: true,
      vehicleTypes: true,
      address: true,
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
    latitude: park.latitude?.toString() || "",
    longitude: park.longitude?.toString() || "",
    website: park.website || "",
    phone: park.phone || "",
    campingWebsite: park.campingWebsite || "",
    campingPhone: park.campingPhone || "",
    dayPassUSD: park.dayPassUSD?.toString() || "",
    milesOfTrails: park.milesOfTrails?.toString() || "",
    acres: park.acres?.toString() || "",
    notes: park.notes || "",
    submitterName: "",
    terrain: park.terrain.map((t) => t.terrain),
    amenities: park.amenities.map((a) => a.amenity),
    camping: park.camping.map((c) => c.camping),
    vehicleTypes: park.vehicleTypes.map((v) => v.vehicleType),
    // New scalar fields
    datesOpen: park.datesOpen || "",
    contactEmail: park.contactEmail || "",
    ownership: park.ownership || "",
    permitRequired: park.permitRequired || false,
    permitType: park.permitType || "",
    membershipRequired: park.membershipRequired || false,
    maxVehicleWidthInches: park.maxVehicleWidthInches?.toString() || "",
    flagsRequired: park.flagsRequired || false,
    sparkArrestorRequired: park.sparkArrestorRequired || false,
    noiseLimitDBA: park.noiseLimitDBA?.toString() || "",
    // Address fields
    streetAddress: park.address?.streetAddress || "",
    streetAddress2: park.address?.streetAddress2 || "",
    addressCity: park.address?.city || "",
    addressState: park.address?.state || "",
    zipCode: park.address?.zipCode || "",
    county: park.address?.county || "",
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
