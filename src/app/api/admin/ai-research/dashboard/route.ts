import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import type { AIResearchDashboard, ResearchStatus, ResearchSessionSummary } from "@/lib/types";

export async function GET() {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const [
    totalParks,
    needsResearch,
    inProgress,
    researched,
    maintenance,
    pendingReviewCount,
    totalSessions,
    costResult,
    recentSessionsRaw,
  ] = await Promise.all([
    prisma.park.count(),
    prisma.park.count({ where: { researchStatus: "NEEDS_RESEARCH" } }),
    prisma.park.count({ where: { researchStatus: "IN_PROGRESS" } }),
    prisma.park.count({ where: { researchStatus: "RESEARCHED" } }),
    prisma.park.count({ where: { researchStatus: "MAINTENANCE" } }),
    prisma.fieldExtraction.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.researchSession.count(),
    prisma.researchSession.aggregate({ _sum: { estimatedCostUSD: true } }),
    prisma.researchSession.findMany({
      include: { park: { select: { name: true, slug: true } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const parksByResearchStatus: Record<ResearchStatus, number> = {
    NEEDS_RESEARCH: needsResearch,
    IN_PROGRESS: inProgress,
    RESEARCHED: researched,
    MAINTENANCE: maintenance,
  };

  const recentSessions: ResearchSessionSummary[] = recentSessionsRaw.map((s) => ({
    id: s.id,
    parkId: s.parkId,
    parkName: s.park.name,
    parkSlug: s.park.slug,
    trigger: s.trigger,
    status: s.status,
    fieldsExtracted: s.fieldsExtracted,
    fieldsApplied: s.fieldsApplied,
    sourcesFound: s.sourcesFound,
    summary: s.summary,
    estimatedCostUSD: s.estimatedCostUSD,
    startedAt: s.startedAt.toISOString(),
    completedAt: s.completedAt?.toISOString() ?? null,
  }));

  const { getDomainAccuracyStats } = await import("@/lib/ai/feedback-loop");
  const domainAccuracy = await getDomainAccuracyStats();

  const dashboard: AIResearchDashboard = {
    totalParks,
    parksByResearchStatus,
    pendingReviewCount,
    totalSessions,
    totalCostUSD: costResult._sum.estimatedCostUSD ?? 0,
    recentSessions,
    domainAccuracy,
  };

  return NextResponse.json(dashboard);
}
