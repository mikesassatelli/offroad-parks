import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

interface ClaimRequestBody {
  claimantName: string;
  claimantEmail: string;
  claimantPhone?: string;
  businessName?: string;
  message?: string;
}

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

  let body: ClaimRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { claimantName, claimantEmail, claimantPhone, businessName, message } = body;

  if (!claimantName?.trim() || !claimantEmail?.trim()) {
    return NextResponse.json(
      { error: "Name and email are required" },
      { status: 400 },
    );
  }

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
