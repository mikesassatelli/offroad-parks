/**
 * DELETE — remove a user (by userId) from an operator account.
 *
 * Note: this only severs the OperatorUser link. The User's USER/role
 * field is untouched. Use /admin/users to demote the user from OPERATOR
 * back to USER if appropriate.
 */
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
): Promise<NextResponse> {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { id: operatorId, userId } = await params;

  const membership = await prisma.operatorUser.findUnique({
    where: { operatorId_userId: { operatorId, userId } },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json(
      { error: "Membership not found" },
      { status: 404 },
    );
  }

  await prisma.operatorUser.delete({
    where: { operatorId_userId: { operatorId, userId } },
  });

  return NextResponse.json({ success: true });
}
