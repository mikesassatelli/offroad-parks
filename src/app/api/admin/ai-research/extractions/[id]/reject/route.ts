import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const { id } = await params;

  const extraction = await prisma.fieldExtraction.findUnique({
    where: { id },
    select: { id: true, status: true, dataSourceId: true },
  });
  if (!extraction) {
    return NextResponse.json({ error: "Extraction not found" }, { status: 404 });
  }
  if (extraction.status !== "PENDING_REVIEW") {
    return NextResponse.json({ error: "Extraction is not pending review" }, { status: 400 });
  }

  await prisma.fieldExtraction.update({
    where: { id },
    data: {
      status: "REJECTED",
      verifiedAt: new Date(),
      verifiedBy: adminResult.user.id,
    },
  });

  // OP-79: Record feedback for accuracy tracking
  if (extraction.dataSourceId) {
    const { recordFeedback } = await import("@/lib/ai/feedback-loop");
    recordFeedback(extraction.dataSourceId, "reject").catch(() => {});
  }

  return NextResponse.json({ success: true });
}
