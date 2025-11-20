import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { recalculateParkRatings } from "@/lib/review-utils";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{
    id: string;
  }>;
};

// POST /api/admin/reviews/[id]/restore - Restore a hidden review
export async function POST(_request: Request, { params }: RouteParams) {
  const session = await auth();

  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check admin role
  const userRole = (session.user as { role?: string })?.role;
  if (userRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Find the review
  const review = await prisma.parkReview.findUnique({
    where: { id },
  });

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  // Update status to approved
  await prisma.parkReview.update({
    where: { id },
    data: { status: "APPROVED" },
  });

  // Recalculate park ratings
  await recalculateParkRatings(review.parkId);

  return NextResponse.json({ success: true });
}
