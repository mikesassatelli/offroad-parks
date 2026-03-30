import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// POST /api/admin/conditions/[id]/reject
// Deletes the pending condition report (no public trace).
export async function POST(_request: Request, { params }: RouteParams) {
  const session = await auth();
  // @ts-expect-error - role added in auth callback
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

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
