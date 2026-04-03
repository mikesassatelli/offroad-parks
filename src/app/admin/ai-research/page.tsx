import { prisma } from "@/lib/prisma";
import Link from "next/link";
import {
  BrainCircuit,
  DollarSign,
  FileSearch,
  AlertCircle,
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

  const totalCost = costResult._sum.estimatedCostUSD ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">AI Research</h1>
        {pendingReviewCount > 0 && (
          <Link
            href="/admin/ai-research/pending"
            className="inline-flex items-center gap-2 rounded-lg bg-yellow-50 px-4 py-2 text-sm font-medium text-yellow-800 border border-yellow-200 hover:bg-yellow-100 transition-colors"
          >
            <AlertCircle className="w-4 h-4" />
            {pendingReviewCount} pending review{pendingReviewCount !== 1 ? "s" : ""}
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <BrainCircuit className="w-4 h-4" />
            Total Parks
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{totalParks}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <AlertCircle className="w-4 h-4" />
            Pending Reviews
          </div>
          <p className="mt-2 text-2xl font-bold text-yellow-600">{pendingReviewCount}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <FileSearch className="w-4 h-4" />
            Research Sessions
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">{totalSessions}</p>
        </div>
        <div className="rounded-lg border border-gray-200 bg-white p-6">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <DollarSign className="w-4 h-4" />
            Total Cost
          </div>
          <p className="mt-2 text-2xl font-bold text-gray-900">${totalCost.toFixed(2)}</p>
        </div>
      </div>

      {/* Research Status Breakdown */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Research Status</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-lg bg-red-50 border border-red-200 p-4">
            <p className="text-sm text-red-600 font-medium">Needs Research</p>
            <p className="mt-1 text-2xl font-bold text-red-900">{needsResearch}</p>
          </div>
          <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-4">
            <p className="text-sm text-yellow-600 font-medium">In Progress</p>
            <p className="mt-1 text-2xl font-bold text-yellow-900">{inProgress}</p>
          </div>
          <div className="rounded-lg bg-green-50 border border-green-200 p-4">
            <p className="text-sm text-green-600 font-medium">Researched</p>
            <p className="mt-1 text-2xl font-bold text-green-900">{researched}</p>
          </div>
          <div className="rounded-lg bg-blue-50 border border-blue-200 p-4">
            <p className="text-sm text-blue-600 font-medium">Maintenance</p>
            <p className="mt-1 text-2xl font-bold text-blue-900">{maintenance}</p>
          </div>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Sessions</h2>
        {recentSessions.length === 0 ? (
          <p className="text-gray-500 text-sm">No research sessions yet. Trigger research on a park to get started.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Park</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Trigger</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Fields</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Cost</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recentSessions.map((session) => (
                  <tr key={session.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      <Link href={`/parks/${session.park.slug}`} className="hover:text-blue-600">
                        {session.park.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {formatTrigger(session.trigger)}
                    </td>
                    <td className="px-4 py-3">
                      <SessionStatusBadge status={session.status} />
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {session.fieldsExtracted}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      ${session.estimatedCostUSD.toFixed(3)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
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
    IN_PROGRESS: "bg-blue-100 text-blue-800 border-blue-200",
    COMPLETED: "bg-green-100 text-green-800 border-green-200",
    FAILED: "bg-red-100 text-red-800 border-red-200",
    PARTIAL: "bg-yellow-100 text-yellow-800 border-yellow-200",
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || "bg-gray-100 text-gray-800 border-gray-200"}`}>
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
