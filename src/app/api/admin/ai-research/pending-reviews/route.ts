import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { getCurrentFieldValue } from "@/lib/ai/research-lifecycle";
import type { FieldExtractionSummary, DbPark } from "@/lib/types";

export async function GET(request: Request) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const url = new URL(request.url);
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const limit = Math.min(100, Math.max(1, parseInt(url.searchParams.get("limit") || "50")));
  const offset = (page - 1) * limit;

  const [extractions, total] = await Promise.all([
    prisma.fieldExtraction.findMany({
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
      skip: offset,
      take: limit,
    }),
    prisma.fieldExtraction.count({ where: { status: "PENDING_REVIEW" } }),
  ]);

  const results: FieldExtractionSummary[] = extractions.map((e) => ({
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
