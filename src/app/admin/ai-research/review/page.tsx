import { prisma } from "@/lib/prisma";
import { getCurrentFieldValue } from "@/lib/ai/research-lifecycle";
import type { DbPark, FieldExtractionSummary } from "@/lib/types";
import { FieldExtractionReview } from "@/components/admin/FieldExtractionReview";
import { CheckCircle2, GitCompareArrows } from "lucide-react";

export default async function ReviewPage() {
  const extractions = await prisma.fieldExtraction.findMany({
    where: { status: "PENDING_REVIEW" },
    include: {
      park: {
        include: {
          terrain: true,
          amenities: true,
          camping: true,
          vehicleTypes: true,
          address: true,
        },
      },
      dataSource: { select: { url: true, title: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const summaries: FieldExtractionSummary[] = extractions.map((e) => ({
    id: e.id,
    parkId: e.parkId,
    parkName: e.park.name,
    parkSlug: e.park.slug,
    fieldName: e.fieldName,
    extractedValue: e.extractedValue,
    currentValue: getCurrentFieldValue(e.park as unknown as DbPark, e.fieldName),
    confidence: e.confidence,
    confidenceScore: e.confidenceScore,
    status: e.status,
    sourcesChecked: e.sourcesChecked,
    sourceUrl: e.dataSource?.url ?? null,
    sourceTitle: e.dataSource?.title ?? null,
    sourceQuote: e.sourceQuote,
    sessionId: e.sessionId,
    createdAt: e.createdAt.toISOString(),
  }));

  // Fields with more than one pending extraction represent a conflict:
  // multiple sources proposed different values for the same field on the same park.
  const conflictKeys = new Set<string>();
  const seen = new Map<string, number>();
  for (const e of summaries) {
    const key = `${e.parkId}:${e.fieldName}`;
    seen.set(key, (seen.get(key) ?? 0) + 1);
  }
  for (const [key, count] of seen) if (count > 1) conflictKeys.add(key);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Review Proposed Changes</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Job 3 of 3. Every value the AI extracts lands here first — grouped by park — and stays
          pending until you act on it. Approving a change applies it to the live park (array fields
          like terrain and amenities are added, never overwritten); denying discards it. You can edit
          a value before approving. Approvals and denials also tune the domain-accuracy scores.
        </p>
      </div>

      {conflictKeys.size > 0 && (
        <div className="rounded-lg border border-amber-200 dark:border-amber-900/40 bg-amber-50 dark:bg-amber-900/20 p-4 flex gap-3">
          <GitCompareArrows className="w-5 h-5 text-amber-700 dark:text-amber-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-300">
            <p className="font-medium">
              {conflictKeys.size} field{conflictKeys.size !== 1 ? "s have" : " has"} conflicting
              proposals.
            </p>
            <p className="mt-1">
              Multiple sources suggested different values for the same field. They appear side by side
              under their park below — approve the correct one and the rest are superseded automatically.
            </p>
          </div>
        </div>
      )}

      {summaries.length === 0 ? (
        <div className="rounded-lg border border-border bg-card p-12 text-center">
          <CheckCircle2 className="w-8 h-8 mx-auto text-green-600 dark:text-green-400 mb-3" />
          <p className="text-foreground font-medium">You&apos;re all caught up</p>
          <p className="text-muted-foreground text-sm mt-1 max-w-md mx-auto">
            No proposed changes are waiting for review. Run AI research on a park from the Research tab
            and its findings will show up here for approval.
          </p>
        </div>
      ) : (
        <FieldExtractionReview extractions={summaries} />
      )}
    </div>
  );
}
