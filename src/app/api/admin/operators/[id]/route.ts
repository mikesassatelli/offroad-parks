/**
 * PATCH / DELETE for a single operator.
 *
 * DELETE behavior:
 *   - OperatorUser rows cascade (FK ON DELETE CASCADE).
 *   - Park.operatorId nulls (FK ON DELETE SET NULL) — parks survive,
 *     they just become unowned.
 */
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

const EDITABLE_FIELDS = ["name", "email", "phone", "website"] as const;
type EditableField = (typeof EDITABLE_FIELDS)[number];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  let body: Partial<Record<EditableField, string | null>>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const existing = await prisma.operator.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  const data: Record<string, string | null> = {};
  for (const field of EDITABLE_FIELDS) {
    if (field in body) {
      const value = body[field];
      if (field === "name") {
        const trimmed = typeof value === "string" ? value.trim() : "";
        if (!trimmed) {
          return NextResponse.json(
            { error: "Name cannot be empty" },
            { status: 400 },
          );
        }
        data.name = trimmed;
      } else if (field === "email") {
        const trimmed =
          typeof value === "string" ? value.trim().toLowerCase() : "";
        if (!trimmed || !trimmed.includes("@")) {
          return NextResponse.json(
            { error: "Valid email is required" },
            { status: 400 },
          );
        }
        data.email = trimmed;
      } else {
        data[field] =
          typeof value === "string" ? value.trim() || null : null;
      }
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No editable fields provided" },
      { status: 400 },
    );
  }

  try {
    const operator = await prisma.operator.update({
      where: { id },
      data,
    });
    return NextResponse.json({ operator });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "Email is already used by another operator" },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { id } = await params;

  const existing = await prisma.operator.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  await prisma.operator.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
