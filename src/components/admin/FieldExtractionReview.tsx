"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, ExternalLink, CheckCheck, XOctagon, Pencil, Check, X, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FieldExtractionSummary } from "@/lib/types";
import { FIELD_DISPLAY_NAMES } from "@/lib/ai/field-display-names";

type Props = {
  extractions: FieldExtractionSummary[];
};

export function FieldExtractionReview({ extractions }: Props) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingBulk, setProcessingBulk] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>("");
  const [editError, setEditError] = useState<string | null>(null);

  // Group extractions by park
  const grouped = new Map<string, FieldExtractionSummary[]>();
  for (const e of extractions) {
    const key = e.parkId;
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(e);
  }

  const handleBulkApprove = async (parkId: string, ids: string[]) => {
    setProcessingBulk(parkId);
    try {
      for (const id of ids) {
        const response = await fetch(`/api/admin/ai-research/extractions/${id}/approve`, {
          method: "POST",
        });
        if (!response.ok) {
          const data = await response.json();
          alert(`Failed to approve extraction: ${data.error}`);
          break;
        }
      }
      router.refresh();
    } finally {
      setProcessingBulk(null);
    }
  };

  const handleBulkReject = async (parkId: string, ids: string[]) => {
    setProcessingBulk(parkId);
    try {
      for (const id of ids) {
        await fetch(`/api/admin/ai-research/extractions/${id}/reject`, {
          method: "POST",
        });
      }
      router.refresh();
    } finally {
      setProcessingBulk(null);
    }
  };

  const handleApprove = async (id: string, editedValue?: string) => {
    setProcessingId(id);
    try {
      const response = await fetch(`/api/admin/ai-research/extractions/${id}/approve`, {
        method: "POST",
        headers: editedValue !== undefined ? { "Content-Type": "application/json" } : undefined,
        body: editedValue !== undefined ? JSON.stringify({ editedValue }) : undefined,
      });
      if (response.ok) {
        setEditingId(null);
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to approve");
      }
    } finally {
      setProcessingId(null);
    }
  };

  const startEdit = (extraction: FieldExtractionSummary) => {
    setEditError(null);
    // Prefill the editor with the human-readable form of the extracted value.
    setEditValue(extraction.extractedValue ? formatValue(extraction.extractedValue) : "");
    setEditingId(extraction.id);
  };

  const saveEdit = (extraction: FieldExtractionSummary) => {
    // Re-encode the edited text back into the JSON shape the API expects,
    // preserving the field's underlying type (array / boolean / number / string).
    const encoded = encodeValue(extraction.fieldName, editValue, extraction.extractedValue);
    if (encoded === null) {
      setEditError("Could not parse that value. For list fields use comma-separated values.");
      return;
    }
    handleApprove(extraction.id, encoded);
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await fetch(`/api/admin/ai-research/extractions/${id}/reject`, {
        method: "POST",
      });
      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to reject");
      }
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-8">
      {Array.from(grouped.entries()).map(([parkId, parkExtractions]) => (
        <div key={parkId} className="rounded-lg border border-border bg-card overflow-hidden">
          <div className="bg-muted/50 px-6 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">
              {parkExtractions[0].parkName}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground mr-2">{parkExtractions.length} field{parkExtractions.length !== 1 ? "s" : ""}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkApprove(parkId, parkExtractions.map(e => e.id))}
                disabled={processingId !== null || processingBulk !== null}
                className="text-green-700 dark:text-green-400 border-green-300 dark:border-green-900/50 hover:bg-green-50 dark:hover:bg-green-900/20"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Approve All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkReject(parkId, parkExtractions.map(e => e.id))}
                disabled={processingId !== null || processingBulk !== null}
                className="text-red-700 dark:text-red-400 border-red-300 dark:border-red-900/50 hover:bg-red-50 dark:hover:bg-red-900/20"
              >
                <XOctagon className="w-4 h-4 mr-1" />
                Reject All
              </Button>
            </div>
          </div>
          <div className="divide-y divide-border">
            {parkExtractions.map((extraction) => (
              <div key={extraction.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-foreground">
                        {FIELD_DISPLAY_NAMES[extraction.fieldName] || extraction.fieldName}
                      </span>
                      <ConfidenceBadge score={extraction.confidenceScore} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">Current Value</p>
                        <p className="text-foreground font-mono bg-muted rounded px-2 py-1 break-all">
                          {extraction.currentValue ? formatValue(extraction.currentValue) : <span className="italic text-muted-foreground">empty</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-muted-foreground text-xs mb-1">
                          {isArrayField(extraction.fieldName) ? "New values to add" : "Extracted Value"}
                        </p>
                        <p className={`text-foreground font-mono rounded px-2 py-1 break-all ${isArrayField(extraction.fieldName) ? "bg-green-50 dark:bg-green-900/20" : "bg-blue-50 dark:bg-blue-900/20"}`}>
                          {extraction.extractedValue ? formatValue(extraction.extractedValue) : <span className="italic text-muted-foreground">null</span>}
                        </p>
                      </div>
                    </div>
                    {editingId === extraction.id && (
                      <div className="mt-3 rounded-md border border-border bg-muted/40 p-3">
                        <label className="block text-xs text-muted-foreground mb-1">
                          {isArrayField(extraction.fieldName)
                            ? "Edit values (comma-separated), then approve"
                            : "Edit value, then approve"}
                        </label>
                        <textarea
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          rows={isArrayField(extraction.fieldName) ? 2 : 1}
                          className="w-full rounded-md border border-input bg-background text-foreground px-2 py-1 text-sm font-mono focus:border-ring focus:ring-1 focus:ring-ring"
                        />
                        {editError && (
                          <p className="mt-1 text-xs text-red-600 dark:text-red-400">{editError}</p>
                        )}
                        <div className="mt-2 flex items-center gap-2">
                          <Button
                            size="sm"
                            onClick={() => saveEdit(extraction)}
                            disabled={processingId !== null}
                            className="text-green-700 dark:text-green-400"
                            variant="outline"
                          >
                            <Check className="w-4 h-4 mr-1" />
                            Approve with edit
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(null);
                              setEditError(null);
                            }}
                            disabled={processingId !== null}
                          >
                            <X className="w-4 h-4 mr-1" />
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    {extraction.sourceQuote && (
                      <blockquote className="mt-3 flex gap-2 rounded-md border-l-2 border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground italic">
                        <Quote className="w-3 h-3 flex-shrink-0 mt-0.5 opacity-60" />
                        <span className="break-words">
                          &ldquo;{extraction.sourceQuote}&rdquo;
                        </span>
                      </blockquote>
                    )}
                    {extraction.sourceUrl && (
                      <div className="mt-2">
                        <a
                          href={extraction.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:text-primary/80"
                        >
                          <ExternalLink className="w-3 h-3" />
                          {extraction.sourceTitle || extraction.sourceUrl}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => (editingId === extraction.id ? setEditingId(null) : startEdit(extraction))}
                      disabled={processingId !== null}
                      title="Edit value before approving"
                      className="text-muted-foreground hover:text-primary hover:bg-primary/10"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleApprove(extraction.id)}
                      disabled={processingId !== null}
                      title="Approve — apply this value to the live park"
                      className="text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleReject(extraction.id)}
                      disabled={processingId !== null}
                      title="Deny — discard this proposed change"
                      className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <XCircle className="w-5 h-5" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ConfidenceBadge({ score }: { score: number | null }) {
  if (score === null) return null;

  let color: string;
  if (score >= 0.7) {
    color = "bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300 border-green-200 dark:border-green-900/50";
  } else if (score >= 0.5) {
    color = "bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300 border-yellow-200 dark:border-yellow-900/50";
  } else {
    color = "bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 border-red-200 dark:border-red-900/50";
  }

  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {Math.round(score * 100)}%
    </span>
  );
}

const ARRAY_FIELDS = new Set(["terrain", "amenities", "camping", "vehicleTypes"]);
function isArrayField(fieldName: string): boolean {
  return ARRAY_FIELDS.has(fieldName);
}

function formatValue(jsonStr: string): string {
  try {
    const val = JSON.parse(jsonStr);
    if (Array.isArray(val)) return val.join(", ");
    if (typeof val === "boolean") return val ? "Yes" : "No";
    return String(val);
  } catch {
    return jsonStr;
  }
}

/**
 * Re-encode admin-edited display text back into the JSON shape the approve API
 * expects, inferring the target type from the field and the original value.
 * Returns null if the input can't be coerced sensibly.
 */
function encodeValue(
  fieldName: string,
  text: string,
  originalJson: string | null
): string | null {
  const trimmed = text.trim();

  if (isArrayField(fieldName)) {
    const items = trimmed
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return JSON.stringify(items);
  }

  // Infer scalar type from the original extracted value when available.
  let originalType: "boolean" | "number" | "string" = "string";
  if (originalJson) {
    try {
      const parsed = JSON.parse(originalJson);
      if (typeof parsed === "boolean") originalType = "boolean";
      else if (typeof parsed === "number") originalType = "number";
    } catch {
      // fall back to string
    }
  }

  if (originalType === "boolean") {
    const lower = trimmed.toLowerCase();
    if (["yes", "true", "1"].includes(lower)) return JSON.stringify(true);
    if (["no", "false", "0"].includes(lower)) return JSON.stringify(false);
    return null;
  }

  if (originalType === "number") {
    const num = Number(trimmed);
    if (Number.isNaN(num)) return null;
    return JSON.stringify(num);
  }

  return JSON.stringify(trimmed);
}
