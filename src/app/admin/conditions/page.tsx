import { prisma } from "@/lib/prisma";
import { ConditionModerationTable } from "@/components/admin/ConditionModerationTable";
import { Activity } from "lucide-react";

export default async function AdminConditionsPage() {
  const conditions = await prisma.trailCondition.findMany({
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
    orderBy: [
      // Pending first, then by newest
      { reportStatus: "asc" },
      { createdAt: "desc" },
    ],
  });

  const pendingCount = conditions.filter(
    (c) => c.reportStatus === "PENDING_REVIEW",
  ).length;
  const publishedCount = conditions.filter(
    (c) => c.reportStatus === "PUBLISHED",
  ).length;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <Activity className="w-8 h-8" />
          Trail Conditions
        </h1>
        <p className="text-gray-600">
          Review and moderate community trail condition reports
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg border border-orange-200 p-4">
          <div className="text-2xl font-bold text-orange-600">
            {pendingCount}
          </div>
          <div className="text-sm text-gray-600">Pending Review</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-green-600">
            {publishedCount}
          </div>
          <div className="text-sm text-gray-600">Published</div>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="text-2xl font-bold text-gray-700">
            {conditions.length}
          </div>
          <div className="text-sm text-gray-600">Total Reports</div>
        </div>
      </div>

      <ConditionModerationTable conditions={conditions} />
    </div>
  );
}
