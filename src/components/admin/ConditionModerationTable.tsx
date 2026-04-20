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

export interface AdminCondition {
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

interface ConditionModerationTableProps {
  conditions: AdminCondition[];
}

type ReportStatusFilter = "ALL" | "PENDING_REVIEW" | "PUBLISHED";

export function ConditionModerationTable({
  conditions,
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
      c.park.name.toLowerCase().includes(search.toLowerCase()),
    );

  const handleApprove = async (conditionId: string) => {
    setProcessingId(conditionId);
    try {
      const response = await fetch(
        `/api/admin/conditions/${conditionId}/approve`,
        { method: "POST" },
      );
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
      const response = await fetch(
        `/api/admin/conditions/${conditionId}/reject`,
        { method: "POST" },
      );
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
        <input
          type="text"
          placeholder="Search by park name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm px-4 py-2 border border-input bg-background text-foreground rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent"
        />
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
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">
                  Park
                </th>
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
                    {/* Park */}
                    <td className="px-6 py-4">
                      <Link
                        href={`/parks/${condition.park.slug}`}
                        className="font-medium text-foreground hover:text-primary flex items-center gap-1"
                      >
                        {condition.park.name}
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                      </Link>
                    </td>

                    {/* Reporter */}
                    <td className="px-6 py-4 text-muted-foreground">
                      {condition.user?.name || condition.user?.email || "Unknown"}
                    </td>

                    {/* Condition status badge */}
                    <td className="px-6 py-4">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                          bg-${label.color}-100 dark:bg-${label.color}-900/30 text-${label.color}-800 dark:text-${label.color}-300`}
                      >
                        {label.label}
                      </span>
                    </td>

                    {/* Note */}
                    <td className="px-6 py-4 max-w-xs">
                      {condition.note ? (
                        <p className="text-foreground italic line-clamp-2 text-xs">
                          &ldquo;{condition.note}&rdquo;
                        </p>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </td>

                    {/* Age */}
                    <td className="px-6 py-4 text-muted-foreground whitespace-nowrap">
                      {formatConditionAge(condition.createdAt)}
                    </td>

                    {/* Actions */}
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
