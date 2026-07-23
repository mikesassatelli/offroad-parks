import { prisma } from "@/lib/prisma";
import {
  Activity,
  BrainCircuit,
  Camera,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FlaskConical,
  Layers,
  MessageSquare,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import {
  DashboardCharts,
  type SeriesPoint,
} from "@/components/admin/DashboardCharts";

export const dynamic = "force-dynamic";

const MS_WEEK = 7 * 24 * 60 * 60 * 1000;
const WEEKS = 12;

// Bucket timestamps into the last `WEEKS` weekly buckets (oldest → newest).
function weeklyBuckets(dates: Date[], now: Date): SeriesPoint[] {
  const buckets: SeriesPoint[] = Array.from({ length: WEEKS }, (_, i) => {
    const end = new Date(now.getTime() - (WEEKS - 1 - i) * MS_WEEK);
    return { label: `${end.getMonth() + 1}/${end.getDate()}`, count: 0 };
  });
  for (const d of dates) {
    const weeksAgo = Math.floor((now.getTime() - d.getTime()) / MS_WEEK);
    const idx = WEEKS - 1 - weeksAgo;
    if (idx >= 0 && idx < WEEKS) buckets[idx].count++;
  }
  return buckets;
}

export default async function AdminDashboard() {
  const now = new Date();
  const since = new Date(now.getTime() - WEEKS * MS_WEEK);

  const [
    pendingParks,
    pendingPhotos,
    pendingReviews,
    pendingConditions,
    pendingClaims,
    pendingFieldReviews,
    researchQueued,
    needsResearch,
    inProgress,
    partial,
    researched,
    totalSessions,
    costAgg,
    parkDates,
    sessionDates,
    recentPendingParks,
    recentPhotos,
  ] = await Promise.all([
    prisma.park.count({ where: { status: "PENDING" } }),
    prisma.parkPhoto.count({ where: { status: "PENDING" } }),
    prisma.parkReview.count({ where: { status: "PENDING" } }),
    prisma.trailCondition.count({ where: { reportStatus: "PENDING_REVIEW" } }),
    prisma.parkClaim.count({ where: { status: "PENDING" } }),
    prisma.fieldExtraction.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.park.count({ where: { researchQueuedAt: { not: null } } }),
    prisma.park.count({ where: { researchStatus: "NEEDS_RESEARCH" } }),
    prisma.park.count({ where: { researchStatus: "IN_PROGRESS" } }),
    prisma.park.count({ where: { researchStatus: "PARTIAL" } }),
    prisma.park.count({ where: { researchStatus: "RESEARCHED" } }),
    prisma.researchSession.count(),
    prisma.researchSession.aggregate({ _sum: { estimatedCostUSD: true } }),
    prisma.park.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.researchSession.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    prisma.park.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "desc" },
      take: 5,
      select: {
        id: true,
        name: true,
        createdAt: true,
        submitterName: true,
        address: { select: { city: true, state: true } },
      },
    }),
    prisma.parkPhoto.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: {
        park: { select: { name: true, slug: true } },
        user: { select: { name: true } },
      },
    }),
  ]);

  const totalCost = costAgg._sum.estimatedCostUSD ?? 0;
  const parksPerWeek = weeklyBuckets(
    parkDates.map((p) => p.createdAt),
    now
  );
  const sessionsPerWeek = weeklyBuckets(
    sessionDates.map((s) => s.createdAt),
    now
  );

  const queues = [
    { label: "Pending parks", value: pendingParks, href: "/admin/parks?status=pending", icon: Clock },
    { label: "Field reviews", value: pendingFieldReviews, href: "/admin/ai-research/review", icon: ClipboardCheck },
    { label: "Pending photos", value: pendingPhotos, href: "/admin/photos", icon: Camera },
    { label: "Pending reviews", value: pendingReviews, href: "/admin/reviews", icon: MessageSquare },
    { label: "Trail conditions", value: pendingConditions, href: "/admin/conditions", icon: Activity },
    { label: "Park claims", value: pendingClaims, href: "/admin/claims", icon: ClipboardList },
    { label: "Research queue", value: researchQueued, href: "/admin/ai-research/research", icon: Layers },
    { label: "Needs research", value: needsResearch, href: "/admin/ai-research/research?status=NEEDS_RESEARCH", icon: FlaskConical },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Dashboard</h1>

      {/* Needs attention */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Needs attention
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {queues.map(({ label, value, href, icon: Icon }) => (
            <Link
              key={label}
              href={href}
              className={`rounded-lg border bg-card p-4 transition-colors hover:bg-accent ${
                value > 0 ? "border-primary/40" : "border-border"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">{label}</span>
                <Icon className="w-4 h-4 text-muted-foreground" />
              </div>
              <p
                className={`mt-2 text-2xl font-bold ${
                  value > 0 ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {value}
              </p>
            </Link>
          ))}
        </div>
      </section>

      {/* AI pipeline health */}
      <section className="rounded-lg border border-border bg-card p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <h2 className="text-lg font-semibold text-foreground flex items-center gap-2">
            <BrainCircuit className="w-5 h-5 text-primary" />
            AI data pipeline
          </h2>
          <Link
            href="/admin/ai-research"
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            Open AI Research →
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <PipelineStat label="Needs research" value={needsResearch} tone="warn" />
          <PipelineStat label="In progress" value={inProgress} tone="neutral" />
          <PipelineStat label="Partial" value={partial} tone="warn" />
          <PipelineStat label="Researched" value={researched} tone="success" />
          <PipelineStat label="Sessions" value={totalSessions} tone="muted" />
          <PipelineStat label="Total cost" value={`$${totalCost.toFixed(2)}`} tone="muted" />
        </div>
      </section>

      {/* Trends */}
      <section>
        <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-3">
          Trends
        </h2>
        <DashboardCharts
          parksPerWeek={parksPerWeek}
          sessionsPerWeek={sessionsPerWeek}
        />
      </section>

      {/* Recent Pending Parks */}
      <div className="bg-card rounded-lg shadow border border-border">
        <div className="p-6 border-b border-border">
          <h2 className="text-xl font-semibold text-foreground">
            Recent Pending Parks
          </h2>
        </div>
        <div className="divide-y divide-border">
          {recentPendingParks.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground">
              No pending parks to review
            </div>
          ) : (
            recentPendingParks.map((park) => (
              <div key={park.id} className="p-6 hover:bg-accent/50 transition-colors">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="text-lg font-medium text-foreground truncate">
                      {park.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {park.address?.city ? `${park.address.city}, ` : ""}
                      {park.address?.state}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Submitted by: {park.submitterName || "Anonymous"} •{" "}
                      {new Date(park.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href={`/admin/parks?highlight=${park.id}`}
                    className="flex-shrink-0 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                  >
                    Review
                  </a>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Recent Photos */}
      <div className="bg-card rounded-lg shadow border border-border">
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-semibold text-foreground">Recent Photos</h2>
          <Link
            href="/admin/photos"
            className="text-sm text-primary hover:text-primary/80 font-medium"
          >
            View All →
          </Link>
        </div>
        <div className="p-6">
          {recentPhotos.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              No photos uploaded yet
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {recentPhotos.map((photo) => (
                <Link
                  key={photo.id}
                  href={`/parks/${photo.park.slug}`}
                  className="group relative aspect-square rounded-lg overflow-hidden border border-border hover:border-primary transition-colors"
                >
                  <Image
                    src={photo.url}
                    alt={
                      /* v8 ignore next - Simple null coalescing for display text */
                      photo.caption || "Park photo"
                    }
                    fill
                    className="object-cover group-hover:scale-105 transition-transform duration-200"
                    sizes="(max-width: 768px) 50vw, 25vw"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity">
                    <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                      <p className="text-sm font-medium truncate">
                        {photo.park.name}
                      </p>
                      <p className="text-xs opacity-90">
                        {photo.status === "PENDING"
                          ? "⏳ Pending"
                          : photo.status === "APPROVED"
                            ? "✓ Approved"
                            : photo.status === "REJECTED"
                              ? "✗ Rejected"
                              : null}
                      </p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PipelineStat({
  label,
  value,
  tone,
}: {
  label: string;
  value: number | string;
  tone: "neutral" | "success" | "warn" | "muted";
}) {
  const toneClass = {
    neutral: "text-foreground",
    success: "text-green-700 dark:text-green-400",
    warn: "text-orange-700 dark:text-orange-400",
    muted: "text-muted-foreground",
  }[tone];
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <div className={`text-xl font-bold ${toneClass}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
