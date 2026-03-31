import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// DELETE /api/admin/claims/[id]
// Hard-deletes a claim. If the claim was APPROVED, also unlinks the operator
// from the park, removes the OperatorUser, and removes the Operator record if
// it has no remaining parks or users.
export async function DELETE(_request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const claim = await prisma.parkClaim.findUnique({
    where: { id },
    include: {
      park: { select: { id: true, operatorId: true } },
    },
  });

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  await prisma.$transaction(async (tx) => {
    // If this claim was approved and the park is still linked to its operator,
    // clean up the operator relationship before deleting.
    if (claim.status === "APPROVED" && claim.park.operatorId) {
      const operatorId = claim.park.operatorId;

      // Unlink park from operator
      await tx.park.update({
        where: { id: claim.parkId },
        data: { operatorId: null },
      });

      // Remove the OperatorUser for this claimant
      await tx.operatorUser.deleteMany({
        where: { operatorId, userId: claim.userId },
      });

      // Remove the Operator itself if it has no remaining parks or users
      const remainingParks = await tx.park.count({ where: { operatorId } });
      const remainingUsers = await tx.operatorUser.count({ where: { operatorId } });
      if (remainingParks === 0 && remainingUsers === 0) {
        await tx.operator.delete({ where: { id: operatorId } });
      }

      // Revert the user's role to USER (only if they are currently OPERATOR,
      // not if they were already ADMIN before the claim was approved)
      const user = await tx.user.findUnique({
        where: { id: claim.userId },
        select: { role: true },
      });
      if (user?.role === "OPERATOR") {
        await tx.user.update({
          where: { id: claim.userId },
          data: { role: "USER" },
        });
      }
    }

    await tx.parkClaim.delete({ where: { id } });
  });

  return NextResponse.json({ success: true });
}
