import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { ArrowRight, FlaskConical } from "lucide-react";
import { reconcileStuckResearch } from "@/lib/ai/research-lifecycle";
import { BulkResearchBar } from "@/components/admin/BulkResearchBar";
import type { ResearchStatus } from "@/lib/types";

export default async function ResearchListPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() || "";
  const statusFilter = params.status || "ALL";

  // Heal any parks stuck in IN_PROGRESS (orphaned fire-and-forget runs) before
  // we read the list, so the statuses shown are accurate.
  await reconcileStuckResearch();

  const where: {
    status: "APPROVED";
    researchStatus?: ResearchStatus;
    name?: { contains: string; mode: "insensitive" };
  } = { status: "APPROVED" };
  if (statusFilter !== "ALL") {
    where.researchStatus = statusFilter as typeof where.researchStatus;
  }
  if (q) {
    where.name = { contains: q, mode: "insensitive" };
  }

  const [parks, queuedCount] = await Promise.all([
    prisma.park.findMany({
      where,
      select: {
        id: true,
        name: true,
        researchStatus: true,
        researchQueuedAt: true,
        address: { select: { state: true } },
        _count: {
          select: {
            dataSources: true,
            fieldExtractions: { where: { status: "PENDING_REVIEW" } },
          },
        },
      },
      orderBy: [{ researchStatus: "asc" }, { name: "asc" }],
      take: 200,
    }),
    prisma.park.count({ where: { researchQueuedAt: { not: null } } }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Research Existing Parks</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Job 2 of 3. Pick a park to open its research workspace, where you can run AI research
          repeatedly, manage its sources, and watch proposed edits accumulate. Nothing is applied
          until you approve it on the Review tab.
        </p>
      </div>

      {/* Search + filters */}
      <form method="GET" className="flex flex-wrap items-center gap-2">
        <input
          type="text"
          name="q"
          defaultValue={q}
          placeholder="Search parks by name..."
          className="flex-1 min-w-[12rem] max-w-md rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
        />
        {statusFilter !== "ALL" && <input type="hidden" name="status" value={statusFilter} />}
        <button
          type="submit"
          className="rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 transition-colors"
        >
          Search
        </button>
      </form>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-medium text-foreground">Status:</span>
        <StatusFilterLink label="All" value="ALL" active={statusFilter === "ALL"} q={q} />
        <StatusFilterLink label="Needs Research" value="NEEDS_RESEARCH" active={statusFilter === "NEEDS_RESEARCH"} q={q} />
        <StatusFilterLink label="In Progress" value="IN_PROGRESS" active={statusFilter === "IN_PROGRESS"} q={q} />
        <StatusFilterLink label="Partial" value="PARTIAL" active={statusFilter === "PARTIAL"} q={q} />
        <StatusFilterLink label="Researched" value="RESEARCHED" active={statusFilter === "RESEARCHED"} q={q} />
        <StatusFilterLink label="Maintenance" value="MAINTENANCE" active={statusFilter === "MAINTENANCE"} q={q} />
      </div>

      {parks.length > 0 && (
        <BulkResearchBar
          parkIds={parks.map((p) => p.id)}
          queuedCount={queuedCount}
        />
      )}

      {parks.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <FlaskConical className="w-8 h-8 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">
            No parks match. {q || statusFilter !== "ALL" ? "Try clearing the filters." : "Seed parks from the Discover tab first."}
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Park</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">State</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Research Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Sources</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">Proposed Changes</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground uppercase"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {parks.map((park) => (
                <tr key={park.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <Link
                      href={`/admin/ai-research/research/${park.id}`}
                      className="text-sm font-medium text-primary hover:text-primary/80"
                    >
                      {park.name}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{park.address?.state ?? "—"}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <ResearchStatusBadge status={park.researchStatus} />
                      {park.researchQueuedAt && (
                        <span className="inline-flex items-center rounded-full bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-900/40 px-2 py-0.5 text-[10px] font-medium">
                          Queued
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-foreground">{park._count.dataSources}</td>
                  <td className="px-4 py-3">
                    {park._count.fieldExtractions > 0 ? (
                      <span className="inline-flex items-center rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border border-yellow-200 dark:border-yellow-900/50 px-2 py-0.5 text-xs font-medium">
                        {park._count.fieldExtractions} pending
                      </span>
                    ) : (
                      <span className="text-sm text-muted-foreground">{"—"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/admin/ai-research/research/${park.id}`}
                      className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80"
                    >
                      Open <ArrowRight className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusFilterLink({
  label,
  value,
  active,
  q,
}: {
  label: string;
  value: string;
  active: boolean;
  q: string;
}) {
  const query = new URLSearchParams();
  if (value !== "ALL") query.set("status", value);
  if (q) query.set("q", q);
  const href = `/admin/ai-research/research${query.toString() ? `?${query.toString()}` : ""}`;
  return (
    <a
      href={href}
      className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
        active ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-accent"
      }`}
    >
      {label}
    </a>
  );
}

function ResearchStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    NEEDS_RESEARCH: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900/50",
    IN_PROGRESS: "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900/50",
    PARTIAL: "bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-900/50",
    RESEARCHED: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-900/50",
    MAINTENANCE: "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-900/50",
  };
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || "bg-muted text-foreground border-border"}`}>
      {status.replace("_", " ")}
    </span>
  );
}
