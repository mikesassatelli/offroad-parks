import { NextResponse } from "next/server";
import { getOperatorContext } from "@/lib/operator-auth";
import { prisma } from "@/lib/prisma";
import { PARK_ALERT_SEVERITIES } from "@/lib/park-alerts";
import type { ParkAlertSeverity } from "@prisma/client";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ parkSlug: string; alertId: string }>;
};

interface PatchAlertBody {
  title?: string;
  body?: string | null;
  severity?: ParkAlertSeverity;
  startsAt?: string | null;
  expiresAt?: string | null;
  isActive?: boolean;
}

function parseOptionalDate(
  value: string | null | undefined
): { ok: true; date: Date | null } | { ok: false; error: string } {
  if (value === undefined) return { ok: true, date: undefined as unknown as null };
  if (value === null || value === "") return { ok: true, date: null };
  const parsed = new Date(value);
  if (isNaN(parsed.getTime())) {
    return { ok: false, error: "Invalid date" };
  }
  return { ok: true, date: parsed };
}

// PATCH /api/operator/parks/[parkSlug]/alerts/[alertId]
export async function PATCH(request: Request, { params }: RouteParams) {
  const { parkSlug, alertId } = await params;
  const ctx = await getOperatorContext(parkSlug);
  if (!ctx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.parkAlert.findUnique({
    where: { id: alertId },
    select: { id: true, parkId: true },
  });
  if (!existing || existing.parkId !== ctx.parkId) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  let body: PatchAlertBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const data: {
    title?: string;
    body?: string | null;
    severity?: ParkAlertSeverity;
    startsAt?: Date | null;
    expiresAt?: Date | null;
    isActive?: boolean;
  } = {};

  if (body.title !== undefined) {
    const title = body.title.trim();
    if (!title) {
      return NextResponse.json({ error: "title cannot be empty" }, { status: 400 });
    }
    if (title.length > 200) {
      return NextResponse.json({ error: "title too long" }, { status: 400 });
    }
    data.title = title;
  }

  if (body.body !== undefined) {
    data.body = body.body ? body.body.trim() || null : null;
  }

  if (body.severity !== undefined) {
    if (!PARK_ALERT_SEVERITIES.includes(body.severity)) {
      return NextResponse.json(
        { error: `severity must be one of: ${PARK_ALERT_SEVERITIES.join(", ")}` },
        { status: 400 }
      );
    }
    data.severity = body.severity;
  }

  if (body.startsAt !== undefined) {
    const parsed = parseOptionalDate(body.startsAt);
    if (!parsed.ok) {
      return NextResponse.json({ error: "startsAt is invalid" }, { status: 400 });
    }
    data.startsAt = parsed.date;
  }

  if (body.expiresAt !== undefined) {
    const parsed = parseOptionalDate(body.expiresAt);
    if (!parsed.ok) {
      return NextResponse.json({ error: "expiresAt is invalid" }, { status: 400 });
    }
    data.expiresAt = parsed.date;
  }

  if (body.isActive !== undefined) {
    data.isActive = !!body.isActive;
  }

  const alert = await prisma.parkAlert.update({
    where: { id: alertId },
    data,
  });

  return NextResponse.json({ success: true, alert });
}

// DELETE /api/operator/parks/[parkSlug]/alerts/[alertId]
export async function DELETE(_request: Request, { params }: RouteParams) {
  const { parkSlug, alertId } = await params;
  const ctx = await getOperatorContext(parkSlug);
  if (!ctx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const existing = await prisma.parkAlert.findUnique({
    where: { id: alertId },
    select: { id: true, parkId: true },
  });
  if (!existing || existing.parkId !== ctx.parkId) {
    return NextResponse.json({ error: "Alert not found" }, { status: 404 });
  }

  await prisma.parkAlert.delete({ where: { id: alertId } });

  return NextResponse.json({ success: true });
}
