import { NextResponse } from "next/server";
import { getOperatorContext } from "@/lib/operator-auth";
import { prisma } from "@/lib/prisma";
import { recalculateParkRatings } from "@/lib/review-utils";

export const runtime = "nodejs";

type RouteParams = {
  params: Promise<{ parkSlug: string; reviewId: string }>;
};

// Operators may transition between APPROVED and HIDDEN only — they cannot hard-delete
// or un-approve a review that was already moderated by an admin.
const ALLOWED_STATUSES = new Set(["APPROVED", "HIDDEN"]);

// PATCH /api/operator/parks/[parkSlug]/reviews/[reviewId]
// Operator moderates a review for their park. Body: { status: "APPROVED" | "HIDDEN" }.
export async function PATCH(request: Request, { params }: RouteParams) {
  const { parkSlug, reviewId } = await params;

  const ctx = await getOperatorContext(parkSlug);
  if (!ctx) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { status } = body;
  if (!status || !ALLOWED_STATUSES.has(status)) {
    return NextResponse.json(
      { error: "status must be APPROVED or HIDDEN" },
      { status: 400 },
    );
  }

  const review = await prisma.parkReview.findUnique({
    where: { id: reviewId },
    select: { id: true, parkId: true },
  });

  if (!review) {
    return NextResponse.json({ error: "Review not found" }, { status: 404 });
  }

  if (review.parkId !== ctx.parkId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await prisma.parkReview.update({
    where: { id: reviewId },
    data: { status: status as "APPROVED" | "HIDDEN" },
  });

  await recalculateParkRatings(review.parkId);

  return NextResponse.json({ success: true });
}
