import { prisma } from "@/lib/prisma";
import { getDomainAccuracyStats } from "@/lib/ai/feedback-loop";
import Link from "next/link";
import {
  BrainCircuit,
  DollarSign,
  FileSearch,
  AlertCircle,
  BarChart3,
} from "lucide-react";

export default async function AIResearchPage() {
  const [
    totalParks,
    needsResearch,
    inProgress,
    researched,
    maintenance,
    pendingReviewCount,
    totalSessions,
    costResult,
    recentSessions,
    domainAccuracy,
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
    getDomainAccuracyStats(),
  ]);

  const totalCost = costResult._sum.estimatedCostUSD ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">AI Research</h1>
        {pendingReviewCount > 0 && (
          <Link
            href="/admin/ai-research/pending"
            className="inline-flex items-center gap-2 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 px-4 py-2 text-sm font-medium text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-900/40 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 transition-colors"
          >
            <AlertCircle className="w-4 h-4" />
            {pendingReviewCount} pending review{pendingReviewCount !== 1 ? "s" : ""}
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <BrainCircuit className="w-4 h-4" />
            Total Parks
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{totalParks}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <AlertCircle className="w-4 h-4" />
            Pending Reviews
          </div>
          <p className="mt-2 text-2xl font-bold text-yellow-600 dark:text-yellow-400">{pendingReviewCount}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <FileSearch className="w-4 h-4" />
            Research Sessions
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{totalSessions}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <DollarSign className="w-4 h-4" />
            Total Cost
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">${totalCost.toFixed(2)}</p>
        </div>
      </div>

      {/* Research Status Breakdown */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Research Status</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 p-4">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">Needs Research</p>
            <p className="mt-1 text-2xl font-bold text-red-900 dark:text-red-200">{needsResearch}</p>
          </div>
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/40 p-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">In Progress</p>
            <p className="mt-1 text-2xl font-bold text-yellow-900 dark:text-yellow-200">{inProgress}</p>
          </div>
          <div className="rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-900/40 p-4">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">Researched</p>
            <p className="mt-1 text-2xl font-bold text-green-900 dark:text-green-200">{researched}</p>
          </div>
          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-900/40 p-4">
            <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Maintenance</p>
            <p className="mt-1 text-2xl font-bold text-blue-900 dark:text-blue-200">{maintenance}</p>
          </div>
        </div>
      </div>

      {/* Domain Accuracy */}
      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-muted-foreground" />
          <h2 className="text-lg font-semibold text-foreground">Domain Accuracy</h2>
        </div>
        {domainAccuracy.length === 0 ? (
          <p className="text-muted-foreground text-sm">No extraction reviews yet. Approve or reject extractions to see accuracy data.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Domain</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Approves</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Rejects</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Accuracy %</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Sources</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {domainAccuracy.map((d) => {
                  const pct = Math.round(d.accuracy * 100);
                  const colorClass =
                    pct >= 70
                      ? "text-green-700 dark:text-green-400"
                      : pct >= 40
                        ? "text-yellow-700 dark:text-yellow-400"
                        : "text-red-700 dark:text-red-400";
                  return (
                    <tr key={d.domain} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">{d.domain}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{d.totalApproves}</td>
                      <td className="px-4 py-3 text-sm text-foreground">{d.totalRejects}</td>
                      <td className="px-4 py-3">
                        <span className={`text-sm font-medium ${colorClass}`}>
                          {pct}%
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-foreground">{d.sourceCount}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Recent Sessions</h2>
        {recentSessions.length === 0 ? (
          <p className="text-muted-foreground text-sm">No research sessions yet. Trigger research on a park to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Park</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Trigger</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Fields</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {recentSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-foreground">
                      <Link href={`/parks/${session.park.slug}`} className="hover:text-primary">
                        {session.park.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {formatTrigger(session.trigger)}
                    </td>
                    <td className="px-4 py-3">
                      <SessionStatusBadge status={session.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      {session.fieldsExtracted}
                    </td>
                    <td className="px-4 py-3 text-sm text-foreground">
                      ${session.estimatedCostUSD.toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-sm text-muted-foreground">
                      {new Date(session.startedAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function SessionStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    IN_PROGRESS: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900/50",
    COMPLETED: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-900/50",
    FAILED: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900/50",
    PARTIAL: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900/50",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || "bg-muted text-foreground border-border"}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function formatTrigger(trigger: string): string {
  const map: Record<string, string> = {
    SCHEDULED_CRON: "Scheduled",
    ADMIN_MANUAL: "Manual",
    OPERATOR_SOURCES: "Operator",
    NEW_PARK_SEEDED: "New Park",
    SOURCE_CHANGED: "Source Changed",
  };
  return map[trigger] || trigger;
}
