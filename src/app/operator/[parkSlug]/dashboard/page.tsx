import { redirect } from "next/navigation";
import { getOperatorContext } from "@/lib/operator-auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, MessageSquare, Camera, Star } from "lucide-react";

interface DashboardPageProps {
  params: Promise<{ parkSlug: string }>;
}

export default async function OperatorDashboardPage({ params }: DashboardPageProps) {
  const { parkSlug } = await params;
  const ctx = await getOperatorContext(parkSlug);

  if (!ctx) {
    redirect("/");
  }

  // Fetch summary stats
  const [reviewCount, photoCount, latestCondition] = await Promise.all([
    prisma.parkReview.count({
      where: { parkId: ctx.parkId, status: "APPROVED" },
    }),
    prisma.parkPhoto.count({
      where: { parkId: ctx.parkId, status: "APPROVED" },
    }),
    prisma.trailCondition.findFirst({
      where: { parkId: ctx.parkId, reportStatus: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      select: { status: true, createdAt: true },
    }),
  ]);

  const park = await prisma.park.findUnique({
    where: { id: ctx.parkId },
    select: { averageRating: true, reviewCount: true },
  });

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">
          Overview for {ctx.parkName}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Star className="w-4 h-4" />
              Avg Rating
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {park?.averageRating ? park.averageRating.toFixed(1) : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              from {park?.reviewCount ?? 0} reviews
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <MessageSquare className="w-4 h-4" />
              Reviews
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{reviewCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Camera className="w-4 h-4" />
              Photos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">{photoCount}</p>
            <p className="text-xs text-gray-500 mt-0.5">approved</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-500 flex items-center gap-2">
              <Activity className="w-4 h-4" />
              Trail Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-gray-900">
              {latestCondition ? latestCondition.status : "—"}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">
              {latestCondition
                ? `as of ${new Date(latestCondition.createdAt).toLocaleDateString()}`
                : "No reports yet"}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <a
            href={`/operator/${parkSlug}/conditions`}
            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-border bg-background hover:bg-muted transition-colors"
          >
            <Activity className="w-4 h-4" />
            Post Trail Status Update
          </a>
          <a
            href={`/operator/${parkSlug}/settings`}
            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-border bg-background hover:bg-muted transition-colors"
          >
            <Camera className="w-4 h-4" />
            Edit Park Details
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
