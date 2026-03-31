import { redirect } from "next/navigation";
import { getOperatorContext } from "@/lib/operator-auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Camera, MessageSquare, Settings, Star } from "lucide-react";

interface DashboardPageProps {
  params: Promise<{ parkSlug: string }>;
}

export default async function OperatorDashboardPage({ params }: DashboardPageProps) {
  const { parkSlug } = await params;
  const ctx = await getOperatorContext(parkSlug);

  if (!ctx) {
    redirect("/");
  }

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

  const stats = [
    {
      label: "Avg Rating",
      value: park?.averageRating ? park.averageRating.toFixed(1) : "—",
      sub: `from ${park?.reviewCount ?? 0} reviews`,
      icon: Star,
      iconColor: "text-yellow-500",
    },
    {
      label: "Reviews",
      value: reviewCount,
      sub: "approved",
      icon: MessageSquare,
      iconColor: "text-blue-500",
    },
    {
      label: "Photos",
      value: photoCount,
      sub: "approved",
      icon: Camera,
      iconColor: "text-purple-500",
    },
    {
      label: "Trail Status",
      value: latestCondition?.status ?? "—",
      sub: latestCondition
        ? `as of ${new Date(latestCondition.createdAt).toLocaleDateString()}`
        : "No reports yet",
      icon: Activity,
      iconColor: "text-green-500",
    },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Overview for {ctx.parkName}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {stats.map(({ label, value, sub, icon: Icon, iconColor }) => (
          <Card key={label}>
            <CardContent className="pt-5 pb-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <Icon className={`w-4 h-4 ${iconColor}`} />
              </div>
              <p className="text-4xl font-bold text-gray-900 leading-none">
                {value}
              </p>
              <p className="text-xs text-muted-foreground mt-2">{sub}</p>
            </CardContent>
          </Card>
        ))}
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
            <Settings className="w-4 h-4" />
            Edit Park Details
          </a>
        </CardContent>
      </Card>
    </div>
  );
}
