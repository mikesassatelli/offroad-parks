import { NextResponse } from "next/server";
import { getOperatorContext } from "@/lib/operator-auth";
import { prisma } from "@/lib/prisma";
import { PARK_ALERT_SEVERITIES } from "@/lib/park-alerts";
import type { ParkAlertSeverity } from "@prisma/client";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ parkSlug: string }>;
};

interface CreateAlertBody {
  title?: string;
  body?: string | null;
  severity?: ParkAlertSeverity;
  startsAt?: string | null;
  expiresAt?: string | null;
}

function parseOptionalDate(
  value: string | null | undefined
): { ok: true; date: Date | null } | { ok: false; error: string } {
  if (value === undefined || value === null || value === "") {
    return { ok: true, date: null };
  }
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return { ok: false, error: "Invalid date" };
  }
  return { ok: true, date: parsed };
}

// GET /api/operator/parks/[parkSlug]/alerts — list all alerts for this park (operator view)
export async function GET(_request: Request, { params }: RouteParams) {
  const { parkSlug } = await params;
  const ctx = await getOperatorContext(parkSlug);
  if (!ctx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const alerts = await prisma.parkAlert.findMany({
    where: { parkId: ctx.parkId },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      title: true,
      body: true,
      severity: true,
      startsAt: true,
      expiresAt: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
      user: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ alerts });
}

// POST /api/operator/parks/[parkSlug]/alerts — create a new alert
export async function POST(request: Request, { params }: RouteParams) {
  const { parkSlug } = await params;
  const ctx = await getOperatorContext(parkSlug);
  if (!ctx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: CreateAlertBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) {
    return NextResponse.json({ error: "title is required" }, { status: 400 });
  }
  if (title.length > 200) {
    return NextResponse.json({ error: "title too long" }, { status: 400 });
  }

  const severity = body.severity ?? "INFO";
  if (!PARK_ALERT_SEVERITIES.includes(severity)) {
    return NextResponse.json(
      { error: `severity must be one of: ${PARK_ALERT_SEVERITIES.join(", ")}` },
      { status: 400 }
    );
  }

  const startsAtResult = parseOptionalDate(body.startsAt);
  if (!startsAtResult.ok) {
    return NextResponse.json({ error: "startsAt is invalid" }, { status: 400 });
  }
  const expiresAtResult = parseOptionalDate(body.expiresAt);
  if (!expiresAtResult.ok) {
    return NextResponse.json({ error: "expiresAt is invalid" }, { status: 400 });
  }
  if (
    startsAtResult.date &&
    expiresAtResult.date &&
    expiresAtResult.date <= startsAtResult.date
  ) {
    return NextResponse.json(
      { error: "expiresAt must be after startsAt" },
      { status: 400 }
    );
  }

  const alert = await prisma.parkAlert.create({
    data: {
      parkId: ctx.parkId,
      userId: ctx.userId,
      title,
      body: body.body?.trim() || null,
      severity,
      startsAt: startsAtResult.date,
      expiresAt: expiresAtResult.date,
    },
  });

  return NextResponse.json({ success: true, alert }, { status: 201 });
}
