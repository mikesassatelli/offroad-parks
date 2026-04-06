import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/api-helpers";
import { prisma } from "@/lib/prisma";
import type { DomainReliabilitySummary } from "@/lib/types";

export async function GET() {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const domains = await prisma.domainReliability.findMany({
    orderBy: { defaultReliability: "desc" },
  });

  const results: DomainReliabilitySummary[] = domains.map((d) => ({
    id: d.id,
    domainPattern: d.domainPattern,
    defaultReliability: d.defaultReliability,
    isBlocked: d.isBlocked,
    notes: d.notes,
    createdAt: d.createdAt.toISOString(),
  }));

  return NextResponse.json({ domains: results });
}

export async function POST(request: Request) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const body = await request.json();
  const { domainPattern, defaultReliability, isBlocked, notes } = body;

  if (!domainPattern || typeof domainPattern !== "string" || !domainPattern.trim()) {
    return NextResponse.json(
      { error: "domainPattern is required" },
      { status: 400 }
    );
  }

  if (
    defaultReliability === undefined ||
    typeof defaultReliability !== "number" ||
    defaultReliability < 0 ||
    defaultReliability > 100
  ) {
    return NextResponse.json(
      { error: "defaultReliability must be a number between 0 and 100" },
      { status: 400 }
    );
  }

  // Check for duplicates
  const existing = await prisma.domainReliability.findUnique({
    where: { domainPattern: domainPattern.trim() },
  });
  if (existing) {
    return NextResponse.json(
      { error: "Domain pattern already exists" },
      { status: 409 }
    );
  }

  const domain = await prisma.domainReliability.create({
    data: {
      domainPattern: domainPattern.trim(),
      defaultReliability,
      isBlocked: isBlocked ?? false,
      notes: notes || null,
    },
  });

  return NextResponse.json({
    success: true,
    domain: {
      id: domain.id,
      domainPattern: domain.domainPattern,
      defaultReliability: domain.defaultReliability,
      isBlocked: domain.isBlocked,
      notes: domain.notes,
      createdAt: domain.createdAt.toISOString(),
    } satisfies DomainReliabilitySummary,
  });
}

export async function PATCH(request: Request) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const body = await request.json();
  const { id, defaultReliability, isBlocked, notes } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const existing = await prisma.domainReliability.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Domain entry not found" },
      { status: 404 }
    );
  }

  const updateData: Record<string, unknown> = {};

  if (defaultReliability !== undefined) {
    if (
      typeof defaultReliability !== "number" ||
      defaultReliability < 0 ||
      defaultReliability > 100
    ) {
      return NextResponse.json(
        { error: "defaultReliability must be between 0 and 100" },
        { status: 400 }
      );
    }
    updateData.defaultReliability = defaultReliability;
  }

  if (isBlocked !== undefined) {
    updateData.isBlocked = Boolean(isBlocked);
  }

  if (notes !== undefined) {
    updateData.notes = notes || null;
  }

  const updated = await prisma.domainReliability.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({
    success: true,
    domain: {
      id: updated.id,
      domainPattern: updated.domainPattern,
      defaultReliability: updated.defaultReliability,
      isBlocked: updated.isBlocked,
      notes: updated.notes,
      createdAt: updated.createdAt.toISOString(),
    } satisfies DomainReliabilitySummary,
  });
}

export async function DELETE(request: Request) {
  const adminResult = await requireAdmin();
  if (adminResult instanceof NextResponse) return adminResult;

  const body = await request.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const existing = await prisma.domainReliability.findUnique({
    where: { id },
  });
  if (!existing) {
    return NextResponse.json(
      { error: "Domain entry not found" },
      { status: 404 }
    );
  }

  await prisma.domainReliability.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
