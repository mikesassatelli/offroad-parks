import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// DELETE /api/admin/pre-grants/[id] — remove a pre-grant (SUPER_ADMIN only).
// Applied grants can still be deleted — the audit row is purely
// informational once `appliedAt` is set.
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const existing = await prisma.userPreGrant.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json(
      { error: "Pre-grant not found" },
      { status: 404 },
    );
  }

  await prisma.userPreGrant.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
