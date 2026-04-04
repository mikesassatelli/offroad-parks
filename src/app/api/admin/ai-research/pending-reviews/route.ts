import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getCurrentFieldValue } from "@/lib/ai/research-lifecycle";
import type { FieldExtractionSummary, DbPark } from "@/lib/types";

const ARRAY_FIELDS = new Set(["terrain", "amenities", "camping", "vehicleTypes"]);

/**
 * Normalize a JSON-encoded value for comparison.
 * Sorts arrays so ["rocks","sand"] matches ["sand","rocks"].
 */
function normalizeForComparison(jsonStr: string): string {
  try {
    const val = JSON.parse(jsonStr);
    if (Array.isArray(val)) return JSON.stringify([...val].sort());
    if (typeof val === "string") return JSON.stringify(val.trim().toLowerCase());
    return JSON.stringify(val);
  } catch {
    return jsonStr;
  }
}

export async function GET(request: Request) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));
  const offset = (page - 1) * limit;

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

  // Reconcile: auto-resolve extractions that are now redundant due to
  // manual edits or other approvals since the extraction was created.
  const staleIds: string[] = [];
  const updatedExtractions: typeof extractions = [];

  for (const e of extractions) {
    const currentValueJson = getCurrentFieldValue(
      e.park as unknown as DbPark,
      e.fieldName
    );

    if (ARRAY_FIELDS.has(e.fieldName) && e.extractedValue) {
      // For array fields: remove values that now exist on the park
      const currentArr: string[] = currentValueJson
        ? JSON.parse(currentValueJson)
        : [];
      const currentSet = new Set(currentArr);
      const suggested = JSON.parse(e.extractedValue) as string[];
      const stillNew = suggested.filter((v) => !currentSet.has(v));

      if (stillNew.length === 0) {
        // All suggested values now exist — mark as superseded
        staleIds.push(e.id);
      } else if (stillNew.length < suggested.length) {
        // Some values were added externally — update the extraction
        // We'll update in DB and adjust the in-memory object for the response
        staleIds.push(`UPDATE:${e.id}:${JSON.stringify(stillNew)}`);
        e.extractedValue = JSON.stringify(stillNew);
        updatedExtractions.push(e);
      } else {
        updatedExtractions.push(e);
      }
    } else if (!ARRAY_FIELDS.has(e.fieldName) && e.extractedValue && currentValueJson) {
      // For scalar fields: if current value now matches, auto-resolve
      if (
        normalizeForComparison(e.extractedValue) ===
        normalizeForComparison(currentValueJson)
      ) {
        staleIds.push(e.id);
      } else {
        updatedExtractions.push(e);
      }
    } else {
      updatedExtractions.push(e);
    }
  }

  // Batch-resolve stale extractions in the background (don't block the response)
  if (staleIds.length > 0) {
    const toSupersede = staleIds.filter((id) => !id.startsWith("UPDATE:"));
    const toUpdate = staleIds
      .filter((id) => id.startsWith("UPDATE:"))
      .map((entry) => {
        const parts = entry.split(":");
        return { id: parts[1], value: parts.slice(2).join(":") };
      });

    // Fire and forget — don't await
    Promise.all([
      toSupersede.length > 0
        ? prisma.fieldExtraction.updateMany({
            where: { id: { in: toSupersede } },
            data: { status: "SUPERSEDED" },
          })
        : Promise.resolve(),
      ...toUpdate.map((u) =>
        prisma.fieldExtraction.update({
          where: { id: u.id },
          data: { extractedValue: u.value },
        })
      ),
    ]).catch(() => {
      // Silently ignore — will reconcile on next page load
    });
  }

  // Paginate the reconciled results
  const total = updatedExtractions.length;
  const paged = updatedExtractions.slice(offset, offset + limit);

  const results: FieldExtractionSummary[] = paged.map((e) => ({
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

  return NextResponse.json({
    extractions: results,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
}
