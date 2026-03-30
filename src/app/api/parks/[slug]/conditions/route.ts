import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { CONDITION_STALE_AFTER_MS } from "@/lib/trail-conditions";
import type { TrailConditionStatus } from "@/lib/trail-conditions";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ slug: string }>;
};

const VALID_STATUSES: TrailConditionStatus[] = [
  "OPEN",
  "CLOSED",
  "CAUTION",
  "MUDDY",
  "WET",
  "SNOW",
];

// GET /api/parks/[slug]/conditions
// Returns PUBLISHED, non-stale condition reports for a park (newest first).
export async function GET(_request: Request, { params }: RouteParams) {
  const { slug } = await params;

  const park = await prisma.park.findUnique({ where: { slug } });
  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  const staleThreshold = new Date(Date.now() - CONDITION_STALE_AFTER_MS);

  const conditions = await prisma.trailCondition.findMany({
    where: {
      parkId: park.id,
      reportStatus: "PUBLISHED",
      createdAt: { gte: staleThreshold },
    },
    include: {
      user: {
        select: { id: true, name: true, image: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return NextResponse.json({ conditions });
}

// POST /api/parks/[slug]/conditions
// Submit a trail condition report. Must be logged in.
// - No note → PUBLISHED immediately
// - Note present → PENDING_REVIEW (admin must approve)
export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { slug } = await params;

  const park = await prisma.park.findUnique({ where: { slug } });
  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  let data: { status?: string; note?: string };
  try {
    data = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!data.status || !VALID_STATUSES.includes(data.status as TrailConditionStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${VALID_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const note = data.note?.trim() || null;
  const reportStatus = note ? "PENDING_REVIEW" : "PUBLISHED";

  const condition = await prisma.trailCondition.create({
    data: {
      parkId: park.id,
      userId: session.user.id,
      status: data.status as TrailConditionStatus,
      note,
      reportStatus,
    },
    include: {
      user: {
        select: { id: true, name: true, image: true },
      },
    },
  });

  const message =
    reportStatus === "PUBLISHED"
      ? "Condition reported successfully."
      : "Condition submitted for review. It will appear after admin approval.";

  return NextResponse.json({ success: true, condition, message }, { status: 201 });
}
