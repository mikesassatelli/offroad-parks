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

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Camera className="w-8 h-8" />
          Photo Moderation
        </h1>
        <p className="text-gray-600">
          Review and moderate user-submitted park photos
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-orange-600">
            {pendingCount}
          </div>
          <div className="text-sm text-gray-600">Pending Review</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">
            {approvedCount}
          </div>
          <div className="text-sm text-gray-600">Approved</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-red-600">{rejectedCount}</div>
          <div className="text-sm text-gray-600">Rejected</div>
        </div>
      </div>

      <PhotoModerationTable photos={photos} />
    </div>
  );
}
