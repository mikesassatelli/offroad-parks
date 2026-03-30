import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { TrailConditionStatus } from "@prisma/client";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ parkSlug: string }>;
};

const VALID_STATUSES: TrailConditionStatus[] = [
  "OPEN",
  "CLOSED",
  "CAUTION",
  "MUDDY",
  "WET",
  "SNOW",
];

interface ConditionBody {
  status: TrailConditionStatus;
  note?: string;
}

// POST /api/operator/parks/[parkSlug]/conditions
// Operator posts a pinned trail status. Auto-published (no admin review needed).
export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { parkSlug } = await params;

  // Verify the user is an operator member for this park
  const park = await prisma.park.findUnique({
    where: { slug: parkSlug, status: "APPROVED" },
    select: {
      id: true,
      name: true,
      operatorId: true,
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

  let body: ConditionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 }
    );
  }

  const condition = await prisma.trailCondition.create({
    data: {
      parkId: park.id,
      userId: session.user.id,
      status: body.status,
      note: body.note?.trim() || null,
      reportStatus: "PUBLISHED",
      isOperatorPost: true,
    },
  });

  return NextResponse.json({ success: true, condition }, { status: 201 });
}

// GET /api/operator/parks/[parkSlug]/conditions
// Returns published conditions for this park (operator view — all, not just fresh).
export async function GET(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { parkSlug } = await params;

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

  const conditions = await prisma.trailCondition.findMany({
    where: { parkId: park.id, reportStatus: "PUBLISHED" },
    orderBy: { createdAt: "desc" },
    take: 20,
    select: {
      id: true,
      status: true,
      note: true,
      isOperatorPost: true,
      createdAt: true,
      user: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ conditions });
}
