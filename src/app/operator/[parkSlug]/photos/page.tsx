import { redirect } from "next/navigation";
import { Camera } from "lucide-react";
import { getOperatorContext } from "@/lib/operator-auth";
import { prisma } from "@/lib/prisma";
import { PhotoModerationTable } from "@/components/moderation/PhotoModerationTable";

interface OperatorPhotosPageProps {
  params: Promise<{ parkSlug: string }>;
}

export default async function OperatorPhotosPage({
  params,
}: OperatorPhotosPageProps) {
  const { parkSlug } = await params;

  // Layout also guards this, but defense-in-depth.
  const ctx = await getOperatorContext(parkSlug);
  if (!ctx) {
    redirect("/");
  }

  const photos = await prisma.parkPhoto.findMany({
    where: { parkId: ctx.parkId },
    include: {
      park: {
        select: {
          name: true,
          slug: true,
        },
      },
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

  const pendingCount = photos.filter((p) => p.status === "PENDING").length;
  const approvedCount = photos.filter((p) => p.status === "APPROVED").length;
  const rejectedCount = photos.filter((p) => p.status === "REJECTED").length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Camera className="w-8 h-8" />
          Photo Moderation
        </h1>
        <p className="text-muted-foreground">
          Review and moderate photos submitted for {ctx.parkName}
        </p>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-2xl font-bold text-orange-600 dark:text-orange-400">{pendingCount}</div>
          <div className="text-sm text-muted-foreground">Pending Review</div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">{approvedCount}</div>
          <div className="text-sm text-muted-foreground">Approved</div>
        </div>
        <div className="bg-card rounded-lg border border-border p-4">
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">{rejectedCount}</div>
          <div className="text-sm text-muted-foreground">Rejected</div>
        </div>
      </div>

      <PhotoModerationTable
        photos={photos}
        apiBase={`/api/operator/parks/${parkSlug}/photos`}
        allowGroupByPark={false}
      />
    </div>
  );
}
