"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle,
  XCircle,
  ExternalLink,
  Loader2,
  Search,
  CheckCheck,
  XOctagon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ParkCandidateSummary } from "@/lib/types";
import Link from "next/link";

const US_STATES = [
  { value: "AL", label: "Alabama" },
  { value: "AK", label: "Alaska" },
  { value: "AZ", label: "Arizona" },
  { value: "AR", label: "Arkansas" },
  { value: "CA", label: "California" },
  { value: "CO", label: "Colorado" },
  { value: "CT", label: "Connecticut" },
  { value: "DE", label: "Delaware" },
  { value: "FL", label: "Florida" },
  { value: "GA", label: "Georgia" },
  { value: "HI", label: "Hawaii" },
  { value: "ID", label: "Idaho" },
  { value: "IL", label: "Illinois" },
  { value: "IN", label: "Indiana" },
  { value: "IA", label: "Iowa" },
  { value: "KS", label: "Kansas" },
  { value: "KY", label: "Kentucky" },
  { value: "LA", label: "Louisiana" },
  { value: "ME", label: "Maine" },
  { value: "MD", label: "Maryland" },
  { value: "MA", label: "Massachusetts" },
  { value: "MI", label: "Michigan" },
  { value: "MN", label: "Minnesota" },
  { value: "MS", label: "Mississippi" },
  { value: "MO", label: "Missouri" },
  { value: "MT", label: "Montana" },
  { value: "NE", label: "Nebraska" },
  { value: "NV", label: "Nevada" },
  { value: "NH", label: "New Hampshire" },
  { value: "NJ", label: "New Jersey" },
  { value: "NM", label: "New Mexico" },
  { value: "NY", label: "New York" },
  { value: "NC", label: "North Carolina" },
  { value: "ND", label: "North Dakota" },
  { value: "OH", label: "Ohio" },
  { value: "OK", label: "Oklahoma" },
  { value: "OR", label: "Oregon" },
  { value: "PA", label: "Pennsylvania" },
  { value: "RI", label: "Rhode Island" },
  { value: "SC", label: "South Carolina" },
  { value: "SD", label: "South Dakota" },
  { value: "TN", label: "Tennessee" },
  { value: "TX", label: "Texas" },
  { value: "UT", label: "Utah" },
  { value: "VT", label: "Vermont" },
  { value: "VA", label: "Virginia" },
  { value: "WA", label: "Washington" },
  { value: "WV", label: "West Virginia" },
  { value: "WI", label: "Wisconsin" },
  { value: "WY", label: "Wyoming" },
];

type Props = {
  candidates: ParkCandidateSummary[];
};

export function ParkDiscoveryTable({ candidates }: Props) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingBulk, setProcessingBulk] = useState<string | null>(null);
  const [rejectReasons, setRejectReasons] = useState<Record<string, string>>(
    {}
  );
  const [showRejectInput, setShowRejectInput] = useState<string | null>(null);

  // Discover parks state
  const [discoverState, setDiscoverState] = useState("");
  const [discovering, setDiscovering] = useState(false);
  const [discoverResult, setDiscoverResult] = useState<string | null>(null);

  const pendingCandidates = candidates.filter((c) => c.status === "PENDING");

  const handleAccept = async (candidateId: string) => {
    setProcessingId(candidateId);
    try {
      const response = await fetch(
        "/api/admin/ai-research/discovery/candidates",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId, action: "accept" }),
        }
      );
      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to accept candidate");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (candidateId: string) => {
    setProcessingId(candidateId);
    try {
      const response = await fetch(
        "/api/admin/ai-research/discovery/candidates",
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidateId,
            action: "reject",
            rejectedReason: rejectReasons[candidateId] || undefined,
          }),
        }
      );
      if (response.ok) {
        setShowRejectInput(null);
        setRejectReasons((prev) => {
          const next = { ...prev };
          delete next[candidateId];
          return next;
        });
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to reject candidate");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const handleBulkAccept = async () => {
    if (pendingCandidates.length === 0) return;
    setProcessingBulk("accept");
    try {
      for (const candidate of pendingCandidates) {
        const response = await fetch(
          "/api/admin/ai-research/discovery/candidates",
          {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ candidateId: candidate.id, action: "accept" }),
          }
        );
        if (!response.ok) {
          const data = await response.json();
          alert(
            `Failed to accept "${candidate.name}": ${data.error || "Unknown error"}`
          );
          break;
        }
      }
      router.refresh();
    } finally {
      setProcessingBulk(null);
    }
  };

  const handleBulkReject = async () => {
    if (pendingCandidates.length === 0) return;
    setProcessingBulk("reject");
    try {
      for (const candidate of pendingCandidates) {
        await fetch("/api/admin/ai-research/discovery/candidates", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ candidateId: candidate.id, action: "reject" }),
        });
      }
      router.refresh();
    } finally {
      setProcessingBulk(null);
    }
  };

  const handleDiscover = async () => {
    if (!discoverState) return;
    setDiscovering(true);
    setDiscoverResult(null);
    try {
      const response = await fetch("/api/admin/ai-research/discovery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state: discoverState }),
      });
      const data = await response.json();
      if (response.ok) {
        setDiscoverResult(
          `Found ${data.candidatesFound} candidate(s) in ${discoverState}.`
        );
        router.refresh();
      } else {
        setDiscoverResult(`Error: ${data.error || "Discovery failed"}`);
      }
    } catch (err) {
      setDiscoverResult(
        `Error: ${err instanceof Error ? err.message : "Network error"}`
      );
    } finally {
      setDiscovering(false);
    }
  };

  const isProcessing = processingId !== null || processingBulk !== null;

  return (
    <div className="space-y-4">
      {/* Discover Parks */}
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm font-medium text-foreground mb-2">
          Discover Parks
        </p>
        <div className="flex items-end gap-3">
          <div className="flex-1 max-w-xs">
            <label className="block text-xs text-muted-foreground mb-1">State</label>
            <select
              value={discoverState}
              onChange={(e) => setDiscoverState(e.target.value)}
              className="w-full rounded-md border border-input bg-background text-foreground px-3 py-2 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
            >
              <option value="">Select a state...</option>
              {US_STATES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label} ({s.value})
                </option>
              ))}
            </select>
          </div>
          <Button
            onClick={handleDiscover}
            disabled={discovering || !discoverState}
            size="sm"
          >
            {discovering ? (
              <>
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="w-4 h-4 mr-1" />
                Search
              </>
            )}
          </Button>
        </div>
        {discoverResult && (
          <div
            className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
              discoverResult.startsWith("Error")
                ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300"
                : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/40 text-green-800 dark:text-green-300"
            }`}
          >
            {discoverResult}
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {pendingCandidates.length > 0 && (
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkAccept}
            disabled={isProcessing}
            className="text-green-700 dark:text-green-400 border-green-300 dark:border-green-900/50 hover:bg-green-50 dark:hover:bg-green-900/20"
          >
            {processingBulk === "accept" ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <CheckCheck className="w-4 h-4 mr-1" />
            )}
            Accept All Pending ({pendingCandidates.length})
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleBulkReject}
            disabled={isProcessing}
            className="text-red-700 dark:text-red-400 border-red-300 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            {processingBulk === "reject" ? (
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
            ) : (
              <XOctagon className="w-4 h-4 mr-1" />
            )}
            Reject All Pending ({pendingCandidates.length})
          </Button>
        </div>
      )}

      {/* Candidates Table */}
      {candidates.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-8 text-center">
          <p className="text-muted-foreground text-sm">
            No candidates found. Use the search above to discover parks in a
            state.
          </p>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <table className="min-w-full divide-y divide-border">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Name
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  State
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  City
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Coordinates
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Source
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {candidates.map((candidate) => (
                <tr key={candidate.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3 text-sm font-medium text-foreground">
                    {candidate.name}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {candidate.state}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {candidate.city || "\u2014"}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">
                    {candidate.estimatedLat && candidate.estimatedLng
                      ? `${candidate.estimatedLat.toFixed(4)}, ${candidate.estimatedLng.toFixed(4)}`
                      : "\u2014"}
                  </td>
                  <td className="px-4 py-3">
                    {candidate.sourceUrl ? (
                      <a
                        href={candidate.sourceUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm text-primary hover:text-primary/80 max-w-[200px] truncate"
                      >
                        <ExternalLink className="w-3 h-3 flex-shrink-0" />
                        Link
                      </a>
                    ) : (
                      <span className="text-sm text-muted-foreground">{"\u2014"}</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge
                      status={candidate.status}
                      seededParkId={candidate.seededParkId}
                      rejectedReason={candidate.rejectedReason}
                    />
                  </td>
                  <td className="px-4 py-3">
                    {candidate.status === "PENDING" ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => handleAccept(candidate.id)}
                          disabled={isProcessing}
                          title="Accept — create park"
                          className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                        >
                          {processingId === candidate.id ? (
                            <Loader2 className="w-5 h-5 animate-spin" />
                          ) : (
                            <CheckCircle className="w-5 h-5" />
                          )}
                        </Button>
                        {showRejectInput === candidate.id ? (
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              placeholder="Reason (optional)"
                              value={rejectReasons[candidate.id] || ""}
                              onChange={(e) =>
                                setRejectReasons((prev) => ({
                                  ...prev,
                                  [candidate.id]: e.target.value,
                                }))
                              }
                              className="w-32 rounded-md border border-input bg-background text-foreground px-2 py-1 text-xs focus:border-destructive focus:ring-1 focus:ring-destructive"
                              onKeyDown={(e) => {
                                if (e.key === "Enter")
                                  handleReject(candidate.id);
                                if (e.key === "Escape")
                                  setShowRejectInput(null);
                              }}
                            />
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleReject(candidate.id)}
                              disabled={isProcessing}
                              title="Confirm reject"
                              className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                              <XCircle className="w-4 h-4" />
                            </Button>
                          </div>
                        ) : (
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              setShowRejectInput(candidate.id)
                            }
                            disabled={isProcessing}
                            title="Reject"
                            className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <XCircle className="w-5 h-5" />
                          </Button>
                        )}
                      </div>
                    ) : null}
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

function StatusBadge({
  status,
  seededParkId,
  rejectedReason,
}: {
  status: string;
  seededParkId: string | null;
  rejectedReason: string | null;
}) {
  const styles: Record<string, string> = {
    PENDING: "bg-muted text-foreground border-border",
    ACCEPTED: "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-900/50",
    REJECTED: "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900/50",
  };

  if (status === "ACCEPTED" && seededParkId) {
    return (
      <Link
        href={`/admin/parks/${seededParkId}`}
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles.ACCEPTED} hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors`}
      >
        Seeded
      </Link>
    );
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${styles[status] || styles.PENDING}`}
      title={status === "REJECTED" && rejectedReason ? rejectedReason : undefined}
    >
      {status}
    </span>
  );
}
