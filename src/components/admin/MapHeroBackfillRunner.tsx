/**
 * Admin UI control for the map-hero backfill (OP-90).
 *
 * Calls POST /api/admin/map-heroes repeatedly until `remaining` hits zero.
 * Shows per-batch progress and any failures.
 */
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, Play, Square, AlertCircle, CheckCircle2 } from "lucide-react";

type BatchFailure = { parkId: string; parkName: string; reason: string };

type RunnerState = {
  running: boolean;
  stopRequested: boolean;
  processed: number;
  succeeded: number;
  remaining: number;
  failures: BatchFailure[];
  error: string | null;
};

export function MapHeroBackfillRunner({ initialRemaining }: { initialRemaining: number }) {
  const [state, setState] = useState<RunnerState>({
    running: false,
    stopRequested: false,
    processed: 0,
    succeeded: 0,
    remaining: initialRemaining,
    failures: [],
    error: null,
  });

  const start = async () => {
    setState((s) => ({
      ...s,
      running: true,
      stopRequested: false,
      processed: 0,
      succeeded: 0,
      failures: [],
      error: null,
    }));

    let shouldStop = false;
    // Loop until empty or user requests stop. We re-read stopRequested via
    // a ref-like pattern: each iteration pulls fresh state.
    while (!shouldStop) {
      let batchResult: {
        processed: number;
        succeeded: number;
        failed: number;
        failures: BatchFailure[];
        remaining: number;
      };

      try {
        const res = await fetch("/api/admin/map-heroes", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ batchSize: 8 }),
        });
        if (!res.ok) {
          const err = await res.text();
          setState((s) => ({ ...s, running: false, error: `HTTP ${res.status}: ${err}` }));
          return;
        }
        batchResult = await res.json();
      } catch (err) {
        setState((s) => ({
          ...s,
          running: false,
          error: err instanceof Error ? err.message : String(err),
        }));
        return;
      }

      setState((s) => {
        const next = {
          ...s,
          processed: s.processed + batchResult.processed,
          succeeded: s.succeeded + batchResult.succeeded,
          failures: [...s.failures, ...batchResult.failures],
          remaining: batchResult.remaining,
        };
        shouldStop = batchResult.processed === 0 || next.stopRequested;
        if (shouldStop) next.running = false;
        return next;
      });
    }
  };

  const stop = () => setState((s) => ({ ...s, stopRequested: true }));

  const done = !state.running && state.processed > 0 && state.remaining === 0;

  return (
    <Card className="p-6 space-y-4">
      <div className="flex items-center gap-3">
        {state.running ? (
          <Button onClick={stop} variant="destructive">
            <Square className="w-4 h-4 mr-2" />
            Stop
          </Button>
        ) : (
          <Button onClick={start} disabled={state.remaining === 0}>
            <Play className="w-4 h-4 mr-2" />
            {state.remaining === 0 ? "All parks covered" : "Run backfill"}
          </Button>
        )}
        {state.running && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing batches…
          </div>
        )}
      </div>

      {(state.running || state.processed > 0) && (
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-gray-500">Processed</div>
            <div className="text-xl font-semibold">{state.processed}</div>
          </div>
          <div>
            <div className="text-gray-500">Succeeded</div>
            <div className="text-xl font-semibold text-green-700">{state.succeeded}</div>
          </div>
          <div>
            <div className="text-gray-500">Remaining</div>
            <div className="text-xl font-semibold">{state.remaining}</div>
          </div>
        </div>
      )}

      {done && (
        <div className="flex items-center gap-2 text-green-700 bg-green-50 border border-green-200 rounded px-3 py-2 text-sm">
          <CheckCircle2 className="w-4 h-4" />
          All eligible parks have a map hero.
        </div>
      )}

      {state.error && (
        <div className="flex items-start gap-2 text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 text-sm">
          <AlertCircle className="w-4 h-4 mt-0.5" />
          <div>
            <div className="font-medium">Batch failed</div>
            <div className="text-red-600 break-all">{state.error}</div>
          </div>
        </div>
      )}

      {state.failures.length > 0 && (
        <div className="border border-amber-200 bg-amber-50 rounded px-3 py-2">
          <div className="flex items-center gap-2 text-amber-900 font-medium mb-2 text-sm">
            <AlertCircle className="w-4 h-4" />
            {state.failures.length} park(s) failed
          </div>
          <ul className="text-xs text-amber-900 space-y-0.5 max-h-48 overflow-y-auto">
            {state.failures.map((f) => (
              <li key={f.parkId}>
                <span className="font-medium">{f.parkName}</span>
                <span className="text-amber-700"> — {f.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
