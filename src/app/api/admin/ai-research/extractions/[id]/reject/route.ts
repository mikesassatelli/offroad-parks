import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function POST(_request: Request, { params }: RouteParams) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const { id } = await params;

  const extraction = await prisma.fieldExtraction.findUnique({ where: { id } });
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

  return NextResponse.json({ success: true });
}
