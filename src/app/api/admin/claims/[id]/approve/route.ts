import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

// POST /api/admin/claims/[id]/approve
// Approves a park claim: creates an Operator + OperatorUser, links park to operator, marks claim APPROVED.
export async function POST(_request: Request, { params }: RouteParams) {
  const session = await auth();
  // @ts-expect-error - role added in auth callback
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const claim = await prisma.parkClaim.findUnique({
    where: { id },
    include: {
      park: { select: { id: true, name: true, operatorId: true } },
      user: { select: { id: true, email: true } },
    },
  });

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (claim.status !== "PENDING") {
    return NextResponse.json(
      { error: "Claim has already been reviewed" },
      { status: 400 }
    );
  }

  if (claim.park.operatorId) {
    return NextResponse.json(
      { error: "Park already has an operator" },
      { status: 409 }
    );
  }

  // Use a transaction: create Operator, OperatorUser, update Park, update Claim
  const result = await prisma.$transaction(async (tx) => {
    const operator = await tx.operator.create({
      data: {
        name: claim.businessName || claim.claimantName,
        email: claim.claimantEmail,
        phone: claim.claimantPhone ?? undefined,
      },
    });

    await tx.operatorUser.create({
      data: {
        operatorId: operator.id,
        userId: claim.userId,
        role: "OWNER",
      },
    });

    await tx.park.update({
      where: { id: claim.parkId },
      data: { operatorId: operator.id },
    });

    const updatedClaim = await tx.parkClaim.update({
      where: { id },
      data: {
        status: "APPROVED",
        reviewedAt: new Date(),
        reviewedBy: session!.user!.id,
      },
    });

    // Update the user's role to OPERATOR
    await tx.user.update({
      where: { id: claim.userId },
      data: { role: "OPERATOR" },
    });

    return { claim: updatedClaim, operator };
  });

  return NextResponse.json({ success: true, ...result });
}
