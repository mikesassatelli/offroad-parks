import { redirect } from "next/navigation";
import { getOperatorContext } from "@/lib/operator-auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Activity, Camera, MessageSquare, Settings, Star } from "lucide-react";

interface DashboardPageProps {
  params: Promise<{ parkSlug: string }>;
  searchParams: Promise<{ from?: string }>;
}

export default async function OperatorDashboardPage({ params, searchParams }: DashboardPageProps) {
  const { parkSlug } = await params;
  const { from } = await searchParams;
  const fromParam = from ? `?from=${from}` : "";
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
      iconBg: "bg-yellow-500",
    },
    {
      label: "Reviews",
      value: reviewCount,
      sub: "approved",
      icon: MessageSquare,
      iconBg: "bg-blue-500",
    },
    {
      label: "Photos",
      value: photoCount,
      sub: "approved",
      icon: Camera,
      iconBg: "bg-purple-500",
    },
    {
      label: "Trail Status",
      value: latestCondition?.status ?? "—",
      sub: latestCondition
        ? `as of ${new Date(latestCondition.createdAt).toLocaleDateString()}`
        : "No reports yet",
      icon: Activity,
      iconBg: "bg-green-500",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Dashboard</h1>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map(({ label, value, sub, icon: Icon, iconBg }) => (
          <div
            key={label}
            className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{value}</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{sub}</p>
              </div>
              <div className={`${iconBg} rounded-full p-3 flex-shrink-0`}>
                <Icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <a
            href={`/operator/${parkSlug}/conditions${fromParam}`}
            className="inline-flex items-center gap-2 text-sm px-4 py-2 rounded-md border border-border bg-background hover:bg-muted transition-colors"
          >
            <Activity className="w-4 h-4" />
            Post Trail Status Update
          </a>
          <a
            href={`/operator/${parkSlug}/settings${fromParam}`}
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
