"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, ShieldAlert, Sparkles, Ban } from "lucide-react";
import { Button } from "@/components/ui/button";

export type DomainBlockSuggestion = {
  domainPattern: string;
  reviewCount: number;
  accuracy: number;
  /** Existing DomainReliability row id, if the domain is already tracked (unblocked). */
  existingId: string | null;
};

type Props = {
  suggestions: DomainBlockSuggestion[];
};

export function DomainSuggestions({ suggestions }: Props) {
  const router = useRouter();
  const [tuning, setTuning] = useState(false);
  const [tuneResult, setTuneResult] = useState<string | null>(null);
  const [blockingPattern, setBlockingPattern] = useState<string | null>(null);

  const handleAutoTune = async () => {
    setTuning(true);
    setTuneResult(null);
    try {
      const res = await fetch("/api/admin/ai-research/domains/auto-tune", {
        method: "POST",
      });
      const data = await res.json();
      if (res.ok) {
        setTuneResult(
          `Adjusted ${data.adjusted} domain score${data.adjusted === 1 ? "" : "s"} from feedback.`
        );
        router.refresh();
      } else {
        setTuneResult(`Error: ${data.error || "Tuning failed"}`);
      }
    } catch (err) {
      setTuneResult(
        `Error: ${err instanceof Error ? err.message : "Network error"}`
      );
    } finally {
      setTuning(false);
    }
  };

  const handleBlock = async (s: DomainBlockSuggestion) => {
    setBlockingPattern(s.domainPattern);
    try {
      const res = s.existingId
        ? await fetch("/api/admin/ai-research/domains", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: s.existingId, isBlocked: true }),
          })
        : await fetch("/api/admin/ai-research/domains", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              domainPattern: s.domainPattern,
              defaultReliability: 0,
              isBlocked: true,
              notes: "Blocked from feedback suggestion",
            }),
          });
      if (res.ok) {
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to block domain");
      }
    } finally {
      setBlockingPattern(null);
    }
  };

  return (
    <div className="mb-4 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Reliability scores auto-tune nightly from your approve/reject feedback.
        </p>
        <Button
          onClick={handleAutoTune}
          disabled={tuning}
          size="sm"
          variant="outline"
        >
          {tuning ? (
            <>
              <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              Tuning...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-1" />
              Auto-tune now
            </>
          )}
        </Button>
      </div>

      {tuneResult && (
        <div
          className={`rounded-lg border px-4 py-2 text-sm ${
            tuneResult.startsWith("Error")
              ? "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-900/40 text-red-800 dark:text-red-300"
              : "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-900/40 text-green-800 dark:text-green-300"
          }`}
        >
          {tuneResult}
        </div>
      )}

      {suggestions.length > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-4">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-4 h-4 text-amber-700 dark:text-amber-400" />
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              {suggestions.length} domain{suggestions.length === 1 ? "" : "s"} suggested for blocking
            </p>
          </div>
          <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mb-3">
            High review volume with mostly-rejected extractions. Blocking stops
            these sources from being crawled in future research.
          </p>
          <ul className="space-y-2">
            {suggestions.map((s) => (
              <li
                key={s.domainPattern}
                className="flex items-center justify-between gap-3 rounded-md bg-card border border-border px-3 py-2"
              >
                <span className="text-sm text-foreground">
                  <span className="font-medium">{s.domainPattern}</span>
                  <span className="text-muted-foreground ml-2">
                    {Math.round(s.accuracy * 100)}% accurate over {s.reviewCount} reviews
                  </span>
                </span>
                <Button
                  onClick={() => handleBlock(s)}
                  disabled={blockingPattern !== null}
                  size="sm"
                  variant="outline"
                  className="text-red-700 dark:text-red-400 border-red-300 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  {blockingPattern === s.domainPattern ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : (
                    <Ban className="w-4 h-4 mr-1" />
                  )}
                  Block
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
