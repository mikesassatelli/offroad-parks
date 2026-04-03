import { prisma } from "@/lib/prisma";
import { getCurrentFieldValue } from "@/lib/ai/research-lifecycle";
import type { DbPark, FieldExtractionSummary } from "@/lib/types";
import { FieldExtractionReview } from "@/components/admin/FieldExtractionReview";

export default async function PendingReviewsPage() {
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
    sessionId: e.sessionId,
    createdAt: e.createdAt.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Review Queue</h1>
        <p className="text-sm text-gray-500">{summaries.length} pending extraction{summaries.length !== 1 ? "s" : ""}</p>
      </div>
      {summaries.length === 0 ? (
        <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
          <p className="text-gray-500">No extractions pending review.</p>
        </div>
      ) : (
        <FieldExtractionReview extractions={summaries} />
      )}
    </div>
  );
}
