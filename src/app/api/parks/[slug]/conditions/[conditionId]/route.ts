import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ slug: string; conditionId: string }>;
};

// DELETE /api/parks/[slug]/conditions/[conditionId]
// Allows a user to delete their own trail condition report.
export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug, conditionId } = await params;

  const park = await prisma.park.findUnique({
    where: { slug },
    select: { id: true },
  });

  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  const condition = await prisma.trailCondition.findUnique({
    where: { id: conditionId },
    select: { id: true, parkId: true, userId: true },
  });

  if (!condition || condition.parkId !== park.id) {
    return NextResponse.json({ error: "Condition not found" }, { status: 404 });
  }

  if (condition.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.trailCondition.delete({ where: { id: conditionId } });

  return NextResponse.json({ success: true });
}
