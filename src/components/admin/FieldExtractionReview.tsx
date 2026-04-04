"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, XCircle, ExternalLink, CheckCheck, XOctagon } from "lucide-react";
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

  const handleApprove = async (id: string) => {
    setProcessingId(id);
    try {
      const response = await fetch(`/api/admin/ai-research/extractions/${id}/approve`, {
        method: "POST",
      });
      if (response.ok) {
        router.refresh();
      } else {
        const data = await response.json();
        alert(data.error || "Failed to approve");
      }
    } finally {
      setProcessingId(null);
    }
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
        <div key={parkId} className="rounded-lg border border-gray-200 bg-white overflow-hidden">
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {parkExtractions[0].parkName}
            </h2>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500 mr-2">{parkExtractions.length} field{parkExtractions.length !== 1 ? "s" : ""}</span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkApprove(parkId, parkExtractions.map(e => e.id))}
                disabled={processingId !== null || processingBulk !== null}
                className="text-green-700 border-green-300 hover:bg-green-50"
              >
                <CheckCheck className="w-4 h-4 mr-1" />
                Approve All
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleBulkReject(parkId, parkExtractions.map(e => e.id))}
                disabled={processingId !== null || processingBulk !== null}
                className="text-red-700 border-red-300 hover:bg-red-50"
              >
                <XOctagon className="w-4 h-4 mr-1" />
                Reject All
              </Button>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {parkExtractions.map((extraction) => (
              <div key={extraction.id} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="font-medium text-gray-900">
                        {FIELD_DISPLAY_NAMES[extraction.fieldName] || extraction.fieldName}
                      </span>
                      <ConfidenceBadge score={extraction.confidenceScore} />
                    </div>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-gray-500 text-xs mb-1">Current Value</p>
                        <p className="text-gray-700 font-mono bg-gray-50 rounded px-2 py-1 break-all">
                          {extraction.currentValue ? formatValue(extraction.currentValue) : <span className="italic text-gray-400">empty</span>}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-500 text-xs mb-1">
                          {isArrayField(extraction.fieldName) ? "New values to add" : "Extracted Value"}
                        </p>
                        <p className={`text-gray-900 font-mono rounded px-2 py-1 break-all ${isArrayField(extraction.fieldName) ? "bg-green-50" : "bg-blue-50"}`}>
                          {extraction.extractedValue ? formatValue(extraction.extractedValue) : <span className="italic text-gray-400">null</span>}
                        </p>
                      </div>
                    </div>
                    {extraction.sourceUrl && (
                      <div className="mt-2">
                        <a
                          href={extraction.sourceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800"
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
                      onClick={() => handleApprove(extraction.id)}
                      disabled={processingId !== null}
                      className="text-green-600 hover:text-green-700 hover:bg-green-50"
                    >
                      <CheckCircle className="w-5 h-5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleReject(extraction.id)}
                      disabled={processingId !== null}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
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
    color = "bg-green-100 text-green-800 border-green-200";
  } else if (score >= 0.5) {
    color = "bg-yellow-100 text-yellow-800 border-yellow-200";
  } else {
    color = "bg-red-100 text-red-800 border-red-200";
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
