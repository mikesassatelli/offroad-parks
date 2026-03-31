import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ parkSlug: string; conditionId: string }>;
};

// PATCH /api/operator/parks/[parkSlug]/conditions/[conditionId]
// Update pinnedUntil — pass a future ISO date to set/extend the pin, or null to unpin.
export async function PATCH(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { parkSlug, conditionId } = await params;

  const park = await prisma.park.findUnique({
    where: { slug: parkSlug, status: "APPROVED" },
    select: {
      id: true,
      operator: {
        select: {
          users: {
            where: { userId: session.user.id },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  if (!park.operator || park.operator.users.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const condition = await prisma.trailCondition.findUnique({
    where: { id: conditionId },
    select: { id: true, parkId: true },
  });

  if (!condition || condition.parkId !== park.id) {
    return NextResponse.json({ error: "Condition not found" }, { status: 404 });
  }

  let body: { pinnedUntil?: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  let pinnedUntil: Date | null = null;
  if (body.pinnedUntil) {
    const parsed = new Date(body.pinnedUntil);
    if (isNaN(parsed.getTime()) || parsed <= new Date()) {
      return NextResponse.json(
        { error: "pinnedUntil must be a valid future date" },
        { status: 400 }
      );
    }
    const maxPin = new Date();
    maxPin.setFullYear(maxPin.getFullYear() + 1);
    if (parsed > maxPin) {
      return NextResponse.json(
        { error: "pinnedUntil cannot be more than 1 year in the future" },
        { status: 400 }
      );
    }
    pinnedUntil = parsed;
  }

  const updated = await prisma.trailCondition.update({
    where: { id: conditionId },
    data: { pinnedUntil },
  });

  return NextResponse.json({ success: true, condition: updated });
}

// DELETE /api/operator/parks/[parkSlug]/conditions/[conditionId]
// Operator deletes a trail condition report they own (or any report for their park).
export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { parkSlug, conditionId } = await params;

  // Verify operator membership for this park
  const park = await prisma.park.findUnique({
    where: { slug: parkSlug, status: "APPROVED" },
    select: {
      id: true,
      operator: {
        select: {
          users: {
            where: { userId: session.user.id },
            select: { role: true },
          },
        },
      },
    },
  });

  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  if (!park.operator || park.operator.users.length === 0) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Verify the condition belongs to this park
  const condition = await prisma.trailCondition.findUnique({
    where: { id: conditionId },
    select: { id: true, parkId: true },
  });

  if (!condition || condition.parkId !== park.id) {
    return NextResponse.json({ error: "Condition not found" }, { status: 404 });
  }

  await prisma.trailCondition.delete({ where: { id: conditionId } });

  return NextResponse.json({ success: true });
}
