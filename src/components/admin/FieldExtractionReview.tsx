"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, ExternalLink, CheckCheck, XOctagon, Pencil, Check, X, Quote } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { FieldExtractionSummary } from "@/lib/types";
import { FIELD_DISPLAY_NAMES } from "@/lib/ai/field-display-names";
import {
  ARRAY_FIELD_OPTIONS,
  OWNERSHIP_OPTIONS,
  EXTRACTABLE_FIELDS,
  humanizeOption,
} from "@/lib/ai/park-fields";

type EditorKind = "array" | "ownership" | "boolean" | "number" | "string";

function editorKind(fieldName: string): EditorKind {
  if (fieldName in ARRAY_FIELD_OPTIONS) return "array";
  const type = EXTRACTABLE_FIELDS[fieldName];
  if (type === "Ownership") return "ownership";
  if (type === "boolean") return "boolean";
  if (type === "number") return "number";
  return "string";
}

function parseArrayValue(json: string): string[] {
  try {
    const v = JSON.parse(json);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

function parseStringValue(json: string | null): string {
  if (!json) return "";
  try {
    const v = JSON.parse(json);
    return typeof v === "string" ? v : String(v);
  } catch {
    return json;
  }
}

function safeParse(json: string): unknown {
  try {
    return JSON.parse(json);
  } catch {
    return json;
  }
}

type Props = {
  extractions: FieldExtractionSummary[];
};

export function FieldExtractionReview({ extractions }: Props) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [processingBulk, setProcessingBulk] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  // `editValue` holds the JSON-encoded value for discrete controls
  // (array/ownership/boolean); `editRaw` holds the raw text for free-typed
  // scalars (number/string) so controlled inputs behave naturally.
  const [editValue, setEditValue] = useState<string>("");
  const [editRaw, setEditRaw] = useState<string>("");
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
    const kind = editorKind(extraction.fieldName);
    const json = extraction.extractedValue;

    if (kind === "number") {
      const n = json ? Number(safeParse(json)) : NaN;
      setEditRaw(Number.isNaN(n) ? "" : String(n));
      setEditValue("");
    } else if (kind === "string") {
      setEditRaw(parseStringValue(json));
      setEditValue("");
    } else {
      // Discrete controls read/write JSON directly.
      const fallback =
        kind === "array" ? "[]" : kind === "ownership" ? '"unknown"' : "false";
      setEditValue(json ?? fallback);
      setEditRaw("");
    }
    setEditingId(extraction.id);
  };

  const saveEdit = (extraction: FieldExtractionSummary) => {
    const kind = editorKind(extraction.fieldName);
    let finalJson: string;

    if (kind === "number") {
      const n = Number(editRaw.trim());
      if (editRaw.trim() === "" || Number.isNaN(n)) {
        setEditError("Enter a valid number.");
        return;
      }
      finalJson = JSON.stringify(n);
    } else if (kind === "string") {
      if (editRaw.trim() === "") {
        setEditError("Value can't be empty.");
        return;
      }
      finalJson = JSON.stringify(editRaw);
    } else if (kind === "array") {
      const arr = parseArrayValue(editValue);
      if (arr.length === 0) {
        setEditError("Select at least one option.");
        return;
      }
      finalJson = JSON.stringify(arr);
    } else {
      // ownership / boolean — the control always yields a valid value.
      finalJson = editValue;
    }

    handleApprove(extraction.id, finalJson);
  };

  const renderEditor = (extraction: FieldExtractionSummary) => {
    const field = extraction.fieldName;
    const kind = editorKind(field);

    if (kind === "array") {
      const options = ARRAY_FIELD_OPTIONS[field];
      const selected = new Set(parseArrayValue(editValue));
      return (
        <div className="flex flex-wrap gap-1.5">
          {options.map((opt) => {
            const checked = selected.has(opt);
            return (
              <label
                key={opt}
                className={`cursor-pointer select-none rounded-full border px-2.5 py-1 text-xs transition-colors ${
                  checked
                    ? "border-green-300 dark:border-green-900/50 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300"
                    : "border-input bg-background text-muted-foreground hover:bg-accent"
                }`}
              >
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={checked}
                  onChange={() => {
                    const next = new Set(selected);
                    if (next.has(opt)) next.delete(opt);
                    else next.add(opt);
                    setEditValue(JSON.stringify([...next]));
                  }}
                />
                {humanizeOption(opt)}
              </label>
            );
          })}
        </div>
      );
    }

    if (kind === "ownership") {
      const current = parseStringValue(editValue);
      return (
        <select
          value={current}
          onChange={(e) => setEditValue(JSON.stringify(e.target.value))}
          className="w-full max-w-xs rounded-md border border-input bg-background text-foreground px-2 py-1 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
        >
          {OWNERSHIP_OPTIONS.map((o) => (
            <option key={o} value={o}>
              {humanizeOption(o)}
            </option>
          ))}
        </select>
      );
    }

    if (kind === "boolean") {
      const current = (() => {
        try {
          return JSON.parse(editValue) === true;
        } catch {
          return false;
        }
      })();
      return (
        <select
          value={current ? "true" : "false"}
          onChange={(e) => setEditValue(JSON.stringify(e.target.value === "true"))}
          className="w-full max-w-[8rem] rounded-md border border-input bg-background text-foreground px-2 py-1 text-sm focus:border-ring focus:ring-1 focus:ring-ring"
        >
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    }

    if (kind === "number") {
      return (
        <input
          type="number"
          value={editRaw}
          onChange={(e) => setEditRaw(e.target.value)}
          className="w-full max-w-[12rem] rounded-md border border-input bg-background text-foreground px-2 py-1 text-sm font-mono focus:border-ring focus:ring-1 focus:ring-ring"
        />
      );
    }

    // string / address
    return (
      <textarea
        value={editRaw}
        onChange={(e) => setEditRaw(e.target.value)}
        rows={1}
        className="w-full rounded-md border border-input bg-background text-foreground px-2 py-1 text-sm font-mono focus:border-ring focus:ring-1 focus:ring-ring"
      />
    );
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
                        <label className="block text-xs text-muted-foreground mb-1.5">
                          {isArrayField(extraction.fieldName)
                            ? "Select values to add, then approve"
                            : "Edit value, then approve"}
                        </label>
                        {renderEditor(extraction)}
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
