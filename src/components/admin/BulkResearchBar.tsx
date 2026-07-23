"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  /** Park ids currently listed (the active filter/search result). */
  parkIds: string[];
  /** How many parks are already sitting in the research queue. */
  queuedCount: number;
};

export function BulkResearchBar({ parkIds, queuedCount }: Props) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const handleQueue = async () => {
    if (parkIds.length === 0) return;
    if (
      !confirm(
        `Queue ${parkIds.length} park${parkIds.length === 1 ? "" : "s"} for research? The background job researches them over time; you'll review the findings on the Review tab.`
      )
    ) {
      return;
    }
    setSubmitting(true);
    setResult(null);
    try {
      const response = await fetch(
        "/api/admin/ai-research/parks/bulk-research",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ parkIds }),
        }
      );
      const data = await response.json();
      if (response.ok) {
        const parts = [`Queued ${data.queued} park(s)`];
        if (data.alreadyQueuedOrIneligible > 0) {
          parts.push(`${data.alreadyQueuedOrIneligible} skipped (already queued or ineligible)`);
        }
        if (typeof data.estimatedCostUSD === "number") {
          parts.push(`est. ~$${data.estimatedCostUSD.toFixed(2)}`);
        }
        setResult(`${parts.join(" · ")}.`);
        router.refresh();
      } else {
        setResult(`Error: ${data.error || "Failed to queue"}`);
      }
    } catch (err) {
      setResult(
        `Error: ${err instanceof Error ? err.message : "Network error"}`
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-foreground">Bulk research</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Queue every park in the current list for background research.
            {queuedCount > 0 && (
              <span className="ml-1 text-amber-700 dark:text-amber-400">
                {queuedCount} already in the queue.
              </span>
            )}
          </p>
        </div>
        <Button
          onClick={handleQueue}
          disabled={submitting || parkIds.length === 0}
          size="sm"
        >
          {submitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Queuing...
            </>
          ) : (
            <>
              <Layers className="w-4 h-4 mr-1" />
              Queue {parkIds.length} park{parkIds.length === 1 ? "" : "s"}
            </>
          )}
        </Button>
      </div>
      {result && (
        <div
          className={`mt-3 rounded-lg border px-4 py-3 text-sm ${
            result.startsWith("Error")
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300"
              : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/40 text-green-800 dark:text-green-300"
          }`}
        >
          {result}
        </div>
      )}
    </div>
  );
}
