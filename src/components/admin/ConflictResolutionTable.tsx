"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ConflictExtraction = {
  id: string;
  extractedValue: string | null;
  confidenceScore: number | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  sourceReliability: number;
  sourceApproveCount: number;
  sourceRejectCount: number;
  createdAt: string;
};

type ConflictGroup = {
  parkId: string;
  parkName: string;
  parkSlug: string;
  fieldName: string;
  fieldLabel: string;
  extractions: ConflictExtraction[];
};

type Props = {
  conflicts: ConflictGroup[];
};

export function ConflictResolutionTable({ conflicts }: Props) {
  const router = useRouter();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const handleChoose = async (extractionId: string) => {
    setProcessingId(extractionId);
    try {
      const response = await fetch(
        `/api/admin/ai-research/extractions/${extractionId}/approve`,
        { method: "POST" },
      );
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

  // Group conflicts by park
  const byPark = new Map<string, ConflictGroup[]>();
  for (const conflict of conflicts) {
    const key = conflict.parkId;
    if (!byPark.has(key)) byPark.set(key, []);
    byPark.get(key)!.push(conflict);
  }

  return (
    <div className="space-y-8">
      {Array.from(byPark.entries()).map(([parkId, parkConflicts]) => (
        <div
          key={parkId}
          className="rounded-lg border border-gray-200 bg-white overflow-hidden"
        >
          {/* Park header */}
          <div className="bg-gray-50 px-6 py-3 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              {parkConflicts[0].parkName}
            </h2>
            <span className="text-xs text-gray-500">
              {parkConflicts.length} conflicting{" "}
              {parkConflicts.length === 1 ? "field" : "fields"}
            </span>
          </div>

          {/* Each conflicting field */}
          <div className="divide-y divide-gray-100">
            {parkConflicts.map((conflict) => (
              <div key={`${conflict.parkId}-${conflict.fieldName}`} className="px-6 py-5">
                {/* Field label */}
                <h3 className="font-medium text-gray-900 mb-3">
                  {conflict.fieldLabel}
                </h3>

                {/* Side-by-side cards */}
                <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${Math.min(conflict.extractions.length, 3)}, 1fr)` }}>
                  {conflict.extractions.map((extraction) => (
                    <ExtractionCard
                      key={extraction.id}
                      extraction={extraction}
                      isProcessing={processingId === extraction.id}
                      isDisabled={processingId !== null}
                      onChoose={() => handleChoose(extraction.id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function ExtractionCard({
  extraction,
  isProcessing,
  isDisabled,
  onChoose,
}: {
  extraction: ConflictExtraction;
  isProcessing: boolean;
  isDisabled: boolean;
  onChoose: () => void;
}) {
  const accuracy = computeAccuracy(
    extraction.sourceApproveCount,
    extraction.sourceRejectCount,
  );

  return (
    <div className="rounded-lg border border-gray-200 p-4 flex flex-col gap-3 bg-gray-50">
      {/* Extracted value */}
      <div>
        <p className="text-gray-500 text-xs mb-1">Value</p>
        <p className="text-gray-900 font-mono bg-white rounded px-2 py-1 break-all text-sm border border-gray-100">
          {extraction.extractedValue
            ? formatValue(extraction.extractedValue)
            : <span className="italic text-gray-400">null</span>}
        </p>
      </div>

      {/* Source info */}
      {extraction.sourceUrl && (
        <div>
          <p className="text-gray-500 text-xs mb-1">Source</p>
          <a
            href={extraction.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 break-all"
          >
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
            {extraction.sourceTitle || extraction.sourceUrl}
          </a>
        </div>
      )}

      {/* Stats row */}
      <div className="flex flex-wrap gap-2 text-xs">
        {/* Source reliability */}
        <ReliabilityBadge reliability={extraction.sourceReliability} />

        {/* Source accuracy */}
        {accuracy !== null && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full font-medium border bg-gray-100 text-gray-700 border-gray-200">
            Accuracy: {Math.round(accuracy * 100)}%
          </span>
        )}

        {/* Confidence score */}
        {extraction.confidenceScore !== null && (
          <ConfidenceBadge score={extraction.confidenceScore} />
        )}
      </div>

      {/* Choose button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onChoose}
        disabled={isDisabled}
        className="w-full text-green-700 border-green-300 hover:bg-green-50 mt-auto"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <CheckCircle className="w-4 h-4" />
        )}
        {isProcessing ? "Applying..." : "Choose This"}
      </Button>
    </div>
  );
}

function ReliabilityBadge({ reliability }: { reliability: number }) {
  let color: string;
  if (reliability >= 70) {
    color = "bg-green-100 text-green-800 border-green-200";
  } else if (reliability >= 40) {
    color = "bg-yellow-100 text-yellow-800 border-yellow-200";
  } else {
    color = "bg-red-100 text-red-800 border-red-200";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium border ${color}`}
    >
      Reliability: {reliability}
    </span>
  );
}

function ConfidenceBadge({ score }: { score: number }) {
  let color: string;
  if (score >= 0.7) {
    color = "bg-green-100 text-green-800 border-green-200";
  } else if (score >= 0.5) {
    color = "bg-yellow-100 text-yellow-800 border-yellow-200";
  } else {
    color = "bg-red-100 text-red-800 border-red-200";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full font-medium border ${color}`}
    >
      Confidence: {Math.round(score * 100)}%
    </span>
  );
}

function computeAccuracy(
  approves: number,
  rejects: number,
): number | null {
  const total = approves + rejects;
  if (total === 0) return null;
  return approves / total;
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
