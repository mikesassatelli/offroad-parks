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
  const now = new Date();

  const conditions = await prisma.trailCondition.findMany({
    where: {
      parkId: park.id,
      reportStatus: "PUBLISHED",
      OR: [
        { createdAt: { gte: staleThreshold } },
        { pinnedUntil: { gt: now } },
      ],
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
// - Admins (any park) and operators of the target park → auto-approved (PUBLISHED)
// - Regular users with no note → PUBLISHED immediately
// - Regular users with a note → PENDING_REVIEW (admin must approve)
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

  const userRole = (session.user as { role?: string }).role;
  const isAdmin = userRole === "ADMIN";

  // Operator scope is park-specific: user must be a member of the operator
  // account that owns this park.
  const isOperatorOfPark = !isAdmin && park.operatorId
    ? !!(await prisma.operatorUser.findUnique({
        where: {
          operatorId_userId: {
            operatorId: park.operatorId,
            userId: session.user.id,
          },
        },
        select: { id: true },
      }))
    : false;

  const isPrivilegedSubmitter = isAdmin || isOperatorOfPark;

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

  // Block if user already has a live (non-expired) condition for this park
  const staleThresholdForUser = new Date(Date.now() - CONDITION_STALE_AFTER_MS);
  const existingCondition = await prisma.trailCondition.findFirst({
    where: {
      parkId: park.id,
      userId: session.user.id,
      createdAt: { gte: staleThresholdForUser },
      reportStatus: { in: ["PUBLISHED", "PENDING_REVIEW"] },
    },
  });

  if (existingCondition) {
    return NextResponse.json(
      { error: "You already have an active trail condition report for this park. Delete it first to submit a new one." },
      { status: 409 }
    );
  }

  const note = data.note?.trim() || null;
  // Admins and operators of this park bypass the note-based moderation gate.
  const reportStatus =
    isPrivilegedSubmitter || !note ? "PUBLISHED" : "PENDING_REVIEW";

  const condition = await prisma.trailCondition.create({
    data: {
      parkId: park.id,
      userId: session.user.id,
      status: data.status as TrailConditionStatus,
      note,
      reportStatus,
      // Flag operator-authored posts so the UI can label them as official.
      isOperatorPost: isOperatorOfPark,
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
