"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, ExternalLink, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import {
  CONDITION_LABELS,
  formatConditionAge,
  type TrailConditionStatus,
} from "@/lib/trail-conditions";

export interface ModerationCondition {
  id: string;
  parkId: string;
  status: TrailConditionStatus;
  note: string | null;
  reportStatus: string;
  createdAt: Date;
  park: {
    name: string;
    slug: string;
  };
  user: {
    name: string | null;
    email: string | null;
  } | null;
}

export type ConditionModerationActionHandlers = {
  approve: (conditionId: string) => Promise<Response>;
  reject: (conditionId: string) => Promise<Response>;
};

export interface ConditionModerationTableProps {
  conditions: ModerationCondition[];
  actions: ConditionModerationActionHandlers;
  /** If true, show "Park" column. Defaults to true — the operator scoped view sets this to false. */
  showParkColumn?: boolean;
}

type ReportStatusFilter = "ALL" | "PENDING_REVIEW" | "PUBLISHED";

export function ConditionModerationTable({
  conditions,
  actions,
  showParkColumn = true,
}: ConditionModerationTableProps) {
  const router = useRouter();
  const [statusFilter, setStatusFilter] =
    useState<ReportStatusFilter>("PENDING_REVIEW");
  const [search, setSearch] = useState("");
  const [processingId, setProcessingId] = useState<string | null>(null);

  const filteredConditions = conditions
    .filter(
      (c) => statusFilter === "ALL" || c.reportStatus === statusFilter,
    )
    .filter((c) =>
      !showParkColumn ||
      c.park.name.toLowerCase().includes(search.toLowerCase()),
    );

  const handleApprove = async (conditionId: string) => {
    setProcessingId(conditionId);
    try {
      const response = await actions.approve(conditionId);
      if (response.ok) {
        router.refresh();
      } else {
        alert("Failed to approve condition report");
      }
    } catch (error) {
      console.error("Failed to approve condition:", error);
      alert("Failed to approve condition report");
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (conditionId: string) => {
    if (
      !confirm(
        "Reject this condition report? It will be permanently deleted.",
      )
    )
      return;
    setProcessingId(conditionId);
    try {
      const response = await actions.reject(conditionId);
      if (response.ok) {
        router.refresh();
      } else {
        alert("Failed to reject condition report");
      }
    } catch (error) {
      console.error("Failed to reject condition:", error);
      alert("Failed to reject condition report");
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = conditions.filter(
    (c) => c.reportStatus === "PENDING_REVIEW",
  ).length;
  const publishedCount = conditions.filter(
    (c) => c.reportStatus === "PUBLISHED",
  ).length;

  return (
    <div className="bg-card rounded-lg shadow border border-border">
      {/* Toolbar */}
      <div className="border-b border-border px-6 py-3 space-y-3">
        {showParkColumn && (
          <input
            type="text"
            placeholder="Search by park name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-sm px-4 py-2 border border-input bg-background text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        )}
        <div className="flex gap-2">
          {(
            [
              { key: "PENDING_REVIEW", label: "Pending Review", count: pendingCount },
              { key: "PUBLISHED", label: "Published", count: publishedCount },
              { key: "ALL", label: "All", count: null },
            ] as const
          ).map(({ key, label, count }) => (
            <button
              key={key}
              onClick={() => setStatusFilter(key)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                statusFilter === key
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-foreground hover:bg-accent"
              }`}
            >
              {label}
              {count !== null && (
                <span className="ml-1.5 text-xs">({count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        {filteredConditions.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground">
            {statusFilter === "PENDING_REVIEW"
              ? "No condition reports pending review"
              : "No condition reports found"}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50 border-b border-border">
              <tr>
                {showParkColumn && (
                  <th className="text-left px-6 py-3 font-medium text-muted-foreground">
                    Park
                  </th>
                )}
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">
                  Reporter
                </th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">
                  Status
                </th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">
                  Note
                </th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">
                  Submitted
                </th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredConditions.map((condition) => {
                const label = CONDITION_LABELS[condition.status];
                const isPending = condition.reportStatus === "PENDING_REVIEW";
                return (
                  <tr
                    key={condition.id}
                    className={isPending ? "bg-orange-50 dark:bg-orange-900/10" : "hover:bg-accent/50 transition-colors"}
                  >
                    {showParkColumn && (
                      <td className="px-6 py-4">
                        <Link
                          href={`/parks/${condition.park.slug}`}
                          className="font-medium text-foreground hover:text-primary flex items-center gap-1"
                        >
                          {condition.park.name}
                          <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        </Link>
                      </td>
                    )}

                    <td className="px-6 py-4 text-muted-foreground">
                      {condition.user?.name || condition.user?.email || "Unknown"}
                    </td>

                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          bg-${label.color}-100 dark:bg-${label.color}-900/30 text-${label.color}-800 dark:text-${label.color}-300`}
                      >
                        {label.label}
                      </span>
                    </td>

                    <td className="px-6 py-4 max-w-xs">
                      {condition.note ? (
                        <p className="text-foreground italic line-clamp-2 text-xs">
                          &ldquo;{condition.note}&rdquo;
                        </p>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {formatConditionAge(condition.createdAt)}
                    </td>

                    <td className="px-6 py-4">
                      {isPending ? (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => handleApprove(condition.id)}
                            disabled={processingId === condition.id}
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleReject(condition.id)}
                            disabled={processingId === condition.id}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Reject
                          </Button>
                        </div>
                      ) : (
                        <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                          Published
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
