import { prisma } from "@/lib/prisma";
import { PhotoModerationTable } from "@/components/admin/PhotoModerationTable";
import { Camera } from "lucide-react";

export default async function AdminPhotosPage() {
  const photos = await prisma.parkPhoto.findMany({
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

  // Parks with no approved photos (need attention)
  const parkPhotoMap = new Map<string, { name: string; hasApproved: boolean }>();
  for (const photo of photos) {
    const existing = parkPhotoMap.get(photo.parkId);
    if (!existing) {
      parkPhotoMap.set(photo.parkId, {
        name: photo.park.name,
        hasApproved: photo.status === "APPROVED",
      });
    } else if (photo.status === "APPROVED") {
      existing.hasApproved = true;
    }
  }
  const noPhotoCount = Array.from(parkPhotoMap.values()).filter(
    (p) => !p.hasApproved,
  ).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
          <Camera className="w-8 h-8" />
          Photo Moderation
        </h1>
        <p className="text-muted-foreground">
          Review, moderate, and audit park photos
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
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
        <div className="bg-card rounded-lg border border-orange-200 dark:border-orange-900/40 p-4">
          <div className="text-2xl font-bold text-orange-500 dark:text-orange-400">{noPhotoCount}</div>
          <div className="text-sm text-muted-foreground">Parks Without Approved Photo</div>
        </div>
      </div>

      <PhotoModerationTable photos={photos} />
    </div>
  );
}
