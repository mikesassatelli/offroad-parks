import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkRateLimit, rateLimited, RATE_LIMITS } from "@/lib/rate-limit";
import { parseJsonBody } from "@/lib/api-helpers";

export const runtime = "nodejs";

const claimCreateSchema = z.object({
  claimantName: z.string({ error: "Name is required" }).trim().min(1, "Name is required").max(200),
  claimantEmail: z
    .string({ error: "Email is required" })
    .trim()
    .min(1, "Email is required")
    .max(320)
    .email("A valid email is required"),
  claimantPhone: z.string().trim().max(50).nullish(),
  businessName: z.string().trim().max(200).nullish(),
  message: z.string().trim().max(2000).nullish(),
});

type RouteParams = {
  params: Promise<{ slug: string }>;
};

// POST /api/parks/[slug]/claim
// Submit a park claim request. Requires authentication.
export async function POST(request: Request, { params }: RouteParams) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const limited = rateLimited(
    checkRateLimit(`claims:${session.user.id}`, RATE_LIMITS.claims),
  );
  if (limited) return limited;

  const { slug } = await params;

  // Find park by slug
  const park = await prisma.park.findUnique({
    where: { slug },
    select: { id: true, name: true, status: true, operatorId: true },
  });

  if (!park) {
    return NextResponse.json({ error: "Park not found" }, { status: 404 });
  }

  if (park.status !== "APPROVED") {
    return NextResponse.json(
      { error: "Park is not available for claiming" },
      { status: 400 },
    );
  }

  if (park.operatorId) {
    return NextResponse.json(
      { error: "This park is already managed by an operator" },
      { status: 409 },
    );
  }

  // Check for existing pending claim from this user
  const existingClaim = await prisma.parkClaim.findUnique({
    where: { parkId_userId: { parkId: park.id, userId: session.user.id } },
  });

  if (existingClaim) {
    return NextResponse.json(
      { error: "You have already submitted a claim for this park" },
      { status: 409 },
    );
  }

  const parsed = await parseJsonBody(request, claimCreateSchema);
  if ("response" in parsed) return parsed.response;
  const { claimantName, claimantEmail, claimantPhone, businessName, message } =
    parsed.data;

  const claim = await prisma.parkClaim.create({
    data: {
      parkId: park.id,
      userId: session.user.id,
      claimantName: claimantName.trim(),
      claimantEmail: claimantEmail.trim(),
      claimantPhone: claimantPhone?.trim() || null,
      businessName: businessName?.trim() || null,
      message: message?.trim() || null,
    },
    select: {
      id: true,
      status: true,
      claimantName: true,
      claimantEmail: true,
      createdAt: true,
    },
  });

  return NextResponse.json({ success: true, claim }, { status: 201 });
}
