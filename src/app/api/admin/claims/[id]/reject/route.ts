import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ id: string }>;
};

interface RejectBody {
  reviewNotes?: string;
}

// POST /api/admin/claims/[id]/reject
export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  // @ts-expect-error - role added in auth callback
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const claim = await prisma.parkClaim.findUnique({ where: { id } });

  if (!claim) {
    return NextResponse.json({ error: "Claim not found" }, { status: 404 });
  }

  if (claim.status !== "PENDING") {
    return NextResponse.json(
      { error: "Claim has already been reviewed" },
      { status: 400 }
    );
  }

  let body: RejectBody = {};
  try {
    body = await request.json();
  } catch {
    // reviewNotes is optional; empty body is fine
  }

  const updatedClaim = await prisma.parkClaim.update({
    where: { id },
    data: {
      status: "REJECTED",
      reviewedAt: new Date(),
      reviewedBy: session.user.id,
      reviewNotes: body.reviewNotes?.trim() || null,
    },
  });

  return NextResponse.json({ success: true, claim: updatedClaim });
}
