/**
 * GET/POST /api/me/search-presets
 *
 * A signed-in user's named Filters-panel presets. All endpoints require
 * authentication; anonymous callers get a 401.
 *
 *  - GET  → `{ presets: Array<{ id, name, filters, updatedAt }> }` (newest first)
 *  - POST → create a preset; body `{ name, filters }`. Enforces a per-user cap
 *           (MAX_PRESETS) and unique names per user.
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createPresetBodySchema, MAX_PRESETS } from "@/lib/search-preferences";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const presets = await prisma.savedSearchFilter.findMany({
    where: { userId: session.user.id },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, filters: true, updatedAt: true },
  });

  return NextResponse.json({ presets });
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createPresetBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid preset payload", issues: z.treeifyError(parsed.error) },
      { status: 400 },
    );
  }

  const count = await prisma.savedSearchFilter.count({
    where: { userId: session.user.id },
  });
  if (count >= MAX_PRESETS) {
    return NextResponse.json(
      { error: `You can save up to ${MAX_PRESETS} presets.` },
      { status: 409 },
    );
  }

  try {
    const preset = await prisma.savedSearchFilter.create({
      data: {
        userId: session.user.id,
        name: parsed.data.name,
        filters: parsed.data.filters,
      },
      select: { id: true, name: true, filters: true, updatedAt: true },
    });
    return NextResponse.json({ preset }, { status: 201 });
  } catch (err) {
    // Unique constraint on [userId, name] — a preset with this name exists.
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
