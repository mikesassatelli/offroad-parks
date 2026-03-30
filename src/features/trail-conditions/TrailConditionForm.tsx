"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CONDITION_LABELS } from "@/lib/trail-conditions";
import type { TrailConditionStatus } from "@/lib/trail-conditions";

interface TrailConditionFormProps {
  parkSlug: string;
  onSuccess: () => void;
}

export function TrailConditionForm({ parkSlug, onSuccess }: TrailConditionFormProps) {
  const [status, setStatus] = useState<TrailConditionStatus | "">("");
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!status) return;

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch(`/api/parks/${parkSlug}/conditions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, note: note.trim() || undefined }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to submit condition report.");
        return;
      }

      setSuccessMessage(data.message);
      setStatus("");
      setNote("");
      onSuccess();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <div>
        <Select
          value={status}
          onValueChange={(v) => setStatus(v as TrailConditionStatus)}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select current condition…" />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(CONDITION_LABELS) as TrailConditionStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {CONDITION_LABELS[s].label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Textarea
          placeholder="Optional short note (e.g. 'Lower trails muddy after rain, upper trails fine') — requires admin review"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={280}
          rows={2}
          className="resize-none text-sm"
        />
        {note.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {note.length}/280 · Will require admin review before publishing
          </p>
        )}
      </div>

      {error && (
        <p className="text-sm text-destructive">{error}</p>
      )}
      {successMessage && (
        <p className="text-sm text-green-600">{successMessage}</p>
      )}

      <Button
        type="submit"
        size="sm"
        disabled={!status || submitting}
        className="w-full"
      >
        {submitting ? "Submitting…" : "Report Condition"}
      </Button>
    </form>
  );
}
