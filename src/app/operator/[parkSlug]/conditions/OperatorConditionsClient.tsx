"use client";

import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Activity, Pin, PinOff, ShieldCheck, Trash2 } from "lucide-react";
import { CONDITION_LABELS, formatConditionAge } from "@/lib/trail-conditions";
import type { TrailConditionStatus } from "@/lib/trail-conditions";

const STATUS_OPTIONS: Array<{ value: TrailConditionStatus; label: string; color: string }> = [
  { value: "OPEN", label: "Open", color: "bg-green-100 text-green-800 border-green-200" },
  { value: "CLOSED", label: "Closed", color: "bg-red-100 text-red-800 border-red-200" },
  { value: "CAUTION", label: "Caution", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  { value: "MUDDY", label: "Muddy", color: "bg-amber-100 text-amber-800 border-amber-200" },
  { value: "WET", label: "Wet", color: "bg-blue-100 text-blue-800 border-blue-200" },
  { value: "SNOW", label: "Snow", color: "bg-sky-100 text-sky-800 border-sky-200" },
];

interface Condition {
  id: string;
  status: TrailConditionStatus;
  note: string | null;
  isOperatorPost: boolean;
  pinnedUntil: string | null;
  createdAt: string;
  user: { id: string; name: string | null };
}

interface OperatorConditionsClientProps {
  parkSlug: string;
  parkName: string;
}

export function OperatorConditionsClient({ parkSlug, parkName }: OperatorConditionsClientProps) {
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [selectedStatus, setSelectedStatus] = useState<TrailConditionStatus>("OPEN");
  const [note, setNote] = useState("");
  const [isPinned, setIsPinned] = useState(false);
  const [pinnedUntil, setPinnedUntil] = useState("");

  const fetchConditions = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/operator/parks/${parkSlug}/conditions`);
      if (res.ok) {
        const data = await res.json();
        setConditions(data.conditions ?? []);
      }
    } catch {
      // Non-critical
    } finally {
      setIsLoading(false);
    }
  }, [parkSlug]);

  useEffect(() => {
    fetchConditions();
  }, [fetchConditions]);

  const handleUpdatePin = async (conditionId: string, newPinnedUntil: string | null) => {
    try {
      const res = await fetch(
        `/api/operator/parks/${parkSlug}/conditions/${conditionId}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pinnedUntil: newPinnedUntil }),
        }
      );
      if (res.ok) {
        setConditions((prev) =>
          prev.map((c) =>
            c.id === conditionId ? { ...c, pinnedUntil: newPinnedUntil } : c
          )
        );
      }
    } catch {
      // Non-critical
    }
  };

  const handleDelete = async (conditionId: string) => {
    setDeletingId(conditionId);
    try {
      const res = await fetch(
        `/api/operator/parks/${parkSlug}/conditions/${conditionId}`,
        { method: "DELETE" }
      );
      if (res.ok) {
        setConditions((prev) => prev.filter((c) => c.id !== conditionId));
      }
    } catch {
      // Non-critical
    } finally {
      setDeletingId(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/operator/parks/${parkSlug}/conditions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          note: note || undefined,
          pinnedUntil: isPinned && pinnedUntil ? pinnedUntil : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to post condition");
        return;
      }

      setSuccess(true);
      setNote("");
      setIsPinned(false);
      setPinnedUntil("");
      fetchConditions();
    } catch {
      setError("Failed to post condition. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Activity className="w-6 h-6" />
          Trail Status
        </h1>
        <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">
          Post authoritative trail condition updates for {parkName}. These appear with a
          &ldquo;Park Operator&rdquo; badge on your public listing.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Post new status */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-blue-600" />
              Post a Status Update
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4" data-testid="condition-form">
              <div>
                <p className="text-sm font-medium mb-2">Current Status</p>
                <div className="grid grid-cols-3 gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSelectedStatus(opt.value)}
                      className={`text-sm px-3 py-2 rounded-md border transition-all ${
                        selectedStatus === opt.value
                          ? `${opt.color} font-semibold ring-2 ring-offset-1 ring-blue-400`
                          : "border-border bg-background hover:bg-muted"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium block mb-1">
                  Note (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                  rows={3}
                  placeholder="E.g. Lower trails are muddy after yesterday&apos;s rain, upper trails are fine."
                />
              </div>

              <div className="border border-border rounded-md p-3 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={isPinned}
                    onChange={(e) => setIsPinned(e.target.checked)}
                    className="rounded"
                  />
                  <Pin className="w-3.5 h-3.5 text-blue-600" />
                  <span className="text-sm font-medium">Pin this update</span>
                </label>
                {isPinned && (
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">
                      Keep pinned until <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="date"
                      required={isPinned}
                      value={pinnedUntil}
                      min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
                      max={new Date(Date.now() + 365 * 86400000).toISOString().split("T")[0]}
                      onChange={(e) => setPinnedUntil(e.target.value)}
                      className="w-full text-sm border border-border rounded-md px-3 py-2 bg-background"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      This update will stay prominently displayed until the selected date, regardless of newer community reports.
                    </p>
                  </div>
                )}
              </div>

              {error && <p className="text-xs text-destructive">{error}</p>}
              {success && (
                <p className="text-xs text-green-600 font-medium">
                  Status update posted successfully!
                </p>
              )}

              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Posting…" : "Post Status Update"}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Recent history */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Updates</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-8 bg-gray-100 dark:bg-gray-700 rounded animate-pulse" />
                ))}
              </div>
            ) : conditions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No condition reports yet.</p>
            ) : (
              <div className="space-y-3">
                {conditions.map((c) => {
                  const isActivePin = c.pinnedUntil && new Date(c.pinnedUntil) > new Date();
                  return (
                    <div key={c.id} className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Badge
                          variant="outline"
                          className={`text-xs ${
                            STATUS_OPTIONS.find((o) => o.value === c.status)?.color ?? ""
                          }`}
                        >
                          {CONDITION_LABELS[c.status].label}
                        </Badge>
                        {c.isOperatorPost && (
                          <ShieldCheck className="w-3 h-3 text-blue-500 flex-shrink-0" />
                        )}
                        {isActivePin && (
                          <Pin className="w-3 h-3 text-blue-500 flex-shrink-0" />
                        )}
                        <span className="text-muted-foreground text-xs">
                          {formatConditionAge(c.createdAt)}
                        </span>
                        {c.note && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 truncate">— {c.note}</span>
                        )}
                        <button
                          onClick={() => handleDelete(c.id)}
                          disabled={deletingId === c.id}
                          className="ml-auto flex-shrink-0 text-gray-400 hover:text-red-500 disabled:opacity-40 transition-colors"
                          aria-label="Delete condition"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      {c.pinnedUntil && (
                        <div className="flex items-center gap-2 pl-0.5">
                          <span className="text-xs text-blue-600">
                            {isActivePin
                              ? `Pinned until ${new Date(c.pinnedUntil).toLocaleDateString()}`
                              : `Pin expired ${new Date(c.pinnedUntil).toLocaleDateString()}`}
                          </span>
                          {isActivePin && (
                            <button
                              onClick={() => handleUpdatePin(c.id, null)}
                              className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-0.5 transition-colors"
                            >
                              <PinOff className="w-3 h-3" />
                              Unpin
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
