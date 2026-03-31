import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// POST /api/admin/conditions/[id]/reject
// Deletes the pending condition report (no public trace).
export async function POST(_request: Request, { params }: RouteParams) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const { id } = await params;

  const condition = await prisma.trailCondition.findUnique({ where: { id } });
  if (!condition) {
    return NextResponse.json({ error: "Condition not found" }, { status: 404 });
  }

  if (condition.reportStatus !== "PENDING_REVIEW") {
    return NextResponse.json(
      { error: "Condition is not pending review" },
      { status: 400 },
    );
  }

  await prisma.trailCondition.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
