/**
 * PATCH/DELETE /api/me/search-presets/[id]
 *
 * Update (rename and/or replace filters) or delete one of the signed-in user's
 * saved filter presets. Both require authentication and only touch presets the
 * caller owns (a mismatched id returns 404, never another user's row).
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updatePresetBodySchema } from "@/lib/search-preferences";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = updatePresetBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid preset payload", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  // Scope the update to the caller's own preset.
  const existing = await prisma.savedSearchFilter.findFirst({
    where: { id, userId: session.user.id },
    select: { id: true },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    const preset = await prisma.savedSearchFilter.update({
      where: { id },
      data: {
        ...(parsed.data.name !== undefined ? { name: parsed.data.name } : {}),
        ...(parsed.data.filters !== undefined
          ? { filters: parsed.data.filters }
          : {}),
      },
      select: { id: true, name: true, filters: true, updatedAt: true },
    });
    return NextResponse.json({ preset });
  } catch (err) {
    if (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json(
        { error: "You already have a preset with that name." },
        { status: 409 },
      );
    }
    throw err;
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { id } = await params;

  // deleteMany scoped by userId so a caller can never delete another user's row.
  const result = await prisma.savedSearchFilter.deleteMany({
    where: { id, userId: session.user.id },
  });
  if (result.count === 0) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
