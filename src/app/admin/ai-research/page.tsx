import { prisma } from "@/lib/prisma";
import { getDomainAccuracyStats } from "@/lib/ai/feedback-loop";
import { computeDomainAdjustments } from "@/lib/ai/domain-tuning";
import { DomainSuggestions } from "@/components/admin/DomainSuggestions";
import Link from "next/link";
import {
  DollarSign,
  FileSearch,
  BarChart3,
  Search,
  FlaskConical,
  ClipboardCheck,
  ArrowRight,
  BrainCircuit,
} from "lucide-react";

export default async function AIResearchPage() {
  const [
    totalParks,
    needsResearch,
    inProgress,
    partial,
    researched,
    maintenance,
    pendingReviewCount,
    pendingCandidates,
    totalSessions,
    costResult,
    recentSessions,
    domainAccuracy,
  ] = await Promise.all([
    prisma.park.count(),
    prisma.park.count({ where: { researchStatus: "NEEDS_RESEARCH" } }),
    prisma.park.count({ where: { researchStatus: "IN_PROGRESS" } }),
    prisma.park.count({ where: { researchStatus: "PARTIAL" } }),
    prisma.park.count({ where: { researchStatus: "RESEARCHED" } }),
    prisma.park.count({ where: { researchStatus: "MAINTENANCE" } }),
    prisma.fieldExtraction.count({ where: { status: "PENDING_REVIEW" } }),
    prisma.parkCandidate.count({ where: { status: "PENDING" } }),
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

  // Surface one-click block suggestions from the same logic the nightly tuner
  // uses, annotated with the existing DomainReliability row id (if any).
  const domainRows = await prisma.domainReliability.findMany({
    select: {
      id: true,
      domainPattern: true,
      defaultReliability: true,
      isBlocked: true,
      locked: true,
    },
  });
  const { blockSuggestions } = computeDomainAdjustments(domainAccuracy, domainRows);
  const domainSuggestions = blockSuggestions.map((s) => ({
    ...s,
    existingId:
      domainRows.find((r) => r.domainPattern === s.domainPattern)?.id ?? null,
  }));

  return (
    <div className="space-y-6">
      {/* Three jobs */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <JobCard
          href="/admin/ai-research/discovery"
          icon={<Search className="w-5 h-5" />}
          title="Discover"
          description="Find parks not yet in the database and seed the good ones."
          metricLabel="candidates awaiting review"
          metricValue={pendingCandidates}
        />
        <JobCard
          href="/admin/ai-research/research"
          icon={<FlaskConical className="w-5 h-5" />}
          title="Research"
          description="Run AI on existing parks to gather more and better data. Research continuously — proposed edits accumulate per park."
          metricLabel="parks still need research"
          metricValue={needsResearch}
        />
        <JobCard
          href="/admin/ai-research/review"
          icon={<ClipboardCheck className="w-5 h-5" />}
          title="Review"
          description="Approve, edit, or deny the AI's proposed field changes. Nothing goes live until you approve it."
          metricLabel="proposed changes pending"
          metricValue={pendingReviewCount}
          highlight={pendingReviewCount > 0}
        />
      </div>

      {/* Supporting stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard icon={<BrainCircuit className="w-4 h-4" />} label="Total Parks" value={totalParks} />
        <StatCard icon={<FileSearch className="w-4 h-4" />} label="Research Sessions" value={totalSessions} />
        <StatCard icon={<DollarSign className="w-4 h-4" />} label="Total Cost" value={`$${totalCost.toFixed(2)}`} />
        <StatCard icon={<ClipboardCheck className="w-4 h-4" />} label="Pending Reviews" value={pendingReviewCount} />
      </div>

      {/* Research Status Breakdown */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold text-foreground mb-4">Research Status</h2>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900/40 p-4">
            <p className="text-sm text-red-600 dark:text-red-400 font-medium">Needs Research</p>
            <p className="mt-1 text-2xl font-bold text-red-900 dark:text-red-200">{needsResearch}</p>
          </div>
          <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-900/40 p-4">
            <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">In Progress</p>
            <p className="mt-1 text-2xl font-bold text-yellow-900 dark:text-yellow-200">{inProgress}</p>
          </div>
          <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 p-4">
            <p className="text-sm text-amber-600 dark:text-amber-400 font-medium">Partial</p>
            <p className="mt-1 text-2xl font-bold text-amber-900 dark:text-amber-200">{partial}</p>
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
        <DomainSuggestions suggestions={domainSuggestions} />
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
                      <Link href={`/admin/ai-research/research/${session.parkId}`} className="hover:text-primary">
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

function JobCard({
  href,
  icon,
  title,
  description,
  metricLabel,
  metricValue,
  highlight,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
  metricLabel: string;
  metricValue: number;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`group flex flex-col rounded-lg border bg-card p-6 transition-colors hover:border-primary/60 hover:bg-accent/30 ${
        highlight ? "border-yellow-300 dark:border-yellow-900/50" : "border-border"
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-primary">
          {icon}
          <span className="text-base font-semibold text-foreground">{title}</span>
        </div>
        <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors" />
      </div>
      <p className="mt-2 text-sm text-muted-foreground flex-1">{description}</p>
      <p className="mt-4 text-sm">
        <span className={`text-2xl font-bold ${highlight ? "text-yellow-600 dark:text-yellow-400" : "text-foreground"}`}>
          {metricValue}
        </span>{" "}
        <span className="text-muted-foreground">{metricLabel}</span>
      </p>
    </Link>
  );
}

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-6">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-foreground">{value}</p>
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
