/**
 * GET/PUT/DELETE /api/me/search-preferences
 *
 * Per-user default Filters panel state. All endpoints require
 * authentication; anonymous callers get a 401.
 *
 *  - GET    → returns `{ filters: <blob> } | null`
 *  - PUT    → upsert; body: `{ filters: <blob> }`
 *  - DELETE → clears the saved default
 */
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { putSearchPreferenceBodySchema } from "@/lib/search-preferences";

export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pref = await prisma.userSearchPreference.findUnique({
    where: { userId: session.user.id },
  });

  if (!pref) {
    return NextResponse.json(null);
  }

  return NextResponse.json({
    filters: pref.filters,
    updatedAt: pref.updatedAt,
  });
}

export async function PUT(request: Request) {
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

  const parsed = putSearchPreferenceBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid filters payload",
        issues: z.treeifyError(parsed.error),
      },
      { status: 400 },
    );
  }

  const pref = await prisma.userSearchPreference.upsert({
    where: { userId: session.user.id },
    create: {
      userId: session.user.id,
      filters: parsed.data.filters,
    },
    update: {
      filters: parsed.data.filters,
    },
  });

  return NextResponse.json({
    success: true,
    filters: pref.filters,
    updatedAt: pref.updatedAt,
  });
}

export async function DELETE() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await prisma.userSearchPreference
    .delete({ where: { userId: session.user.id } })
    .catch((err: { code?: string }) => {
      // P2025: no row to delete — treat as idempotent success.
      if (err?.code !== "P2025") throw err;
    });

  return NextResponse.json({ success: true });
}
