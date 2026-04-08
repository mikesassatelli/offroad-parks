import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import { FIELD_DISPLAY_NAMES } from "@/lib/ai/field-display-names";

export async function GET() {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const extractions = await prisma.fieldExtraction.findMany({
    where: { status: "CONFLICT" },
    include: {
      park: { select: { id: true, name: true, slug: true } },
      dataSource: {
        select: {
          url: true,
          title: true,
          reliability: true,
          approveCount: true,
          rejectCount: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Group by parkId + fieldName
  const groupMap = new Map<
    string,
    {
      parkId: string;
      parkName: string;
      parkSlug: string;
      fieldName: string;
      fieldLabel: string;
      extractions: Array<{
        id: string;
        extractedValue: string | null;
        confidenceScore: number | null;
        sourceUrl: string | null;
        sourceTitle: string | null;
        sourceReliability: number;
        sourceApproveCount: number;
        sourceRejectCount: number;
        createdAt: string;
      }>;
    }
  >();

  for (const e of extractions) {
    const key = `${e.parkId}::${e.fieldName}`;
    if (!groupMap.has(key)) {
      groupMap.set(key, {
        parkId: e.parkId,
        parkName: e.park.name,
        parkSlug: e.park.slug,
        fieldName: e.fieldName,
        fieldLabel: FIELD_DISPLAY_NAMES[e.fieldName] || e.fieldName,
        extractions: [],
      });
    }
    groupMap.get(key)!.extractions.push({
      id: e.id,
      extractedValue: e.extractedValue,
      confidenceScore: e.confidenceScore,
      sourceUrl: e.dataSource?.url ?? null,
      sourceTitle: e.dataSource?.title ?? null,
      sourceReliability: e.dataSource?.reliability ?? 0,
      sourceApproveCount: e.dataSource?.approveCount ?? 0,
      sourceRejectCount: e.dataSource?.rejectCount ?? 0,
      createdAt: e.createdAt.toISOString(),
    });
  }

  // Sort groups: most conflicting extractions first
  const conflicts = Array.from(groupMap.values()).sort(
    (a, b) => b.extractions.length - a.extractions.length,
  );

  return NextResponse.json({
    conflicts,
    totalConflicts: conflicts.length,
  });
}
