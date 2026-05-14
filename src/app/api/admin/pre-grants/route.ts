import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ASSIGNABLE_ROLES = ["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN"] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

async function requireSuperAdmin() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return { session };
}

// GET /api/admin/pre-grants — list all pre-grants (SUPER_ADMIN only).
export async function GET() {
  const auth = await requireSuperAdmin();
  if ("error" in auth) return auth.error;

  const grants = await prisma.userPreGrant.findMany({
    orderBy: [{ appliedAt: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ grants });
}

// POST /api/admin/pre-grants — create a new pre-grant (SUPER_ADMIN only).
// Body: { email, grantRole?, operatorParkSlug?, notes? }
export async function POST(request: Request) {
  const authResult = await requireSuperAdmin();
  if ("error" in authResult) return authResult.error;

  let body: {
    email?: string;
    grantRole?: string | null;
    operatorParkSlug?: string | null;
    notes?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const email = body.email?.trim().toLowerCase();
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Valid email is required" },
      { status: 400 },
    );
  }

  if (
    body.grantRole &&
    !ASSIGNABLE_ROLES.includes(body.grantRole as AssignableRole)
  ) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${ASSIGNABLE_ROLES.join(", ")}` },
      { status: 400 },
    );
  }

  // Require at least one grant axis — otherwise the row does nothing.
  if (!body.grantRole && !body.operatorParkSlug) {
    return NextResponse.json(
      { error: "Pre-grant must include a role and/or operatorParkSlug" },
      { status: 400 },
    );
  }

  // Validate the park slug exists at creation time — saves admin from
  // discovering the typo at the tester's first sign-in.
  if (body.operatorParkSlug) {
    const park = await prisma.park.findUnique({
      where: { slug: body.operatorParkSlug },
      select: { id: true },
    });
    if (!park) {
      return NextResponse.json(
        { error: `Park slug '${body.operatorParkSlug}' not found` },
        { status: 400 },
      );
    }
  }

  // Reject duplicate. SUPER_ADMIN can delete + re-create if they need to
  // change a pre-grant.
  const existing = await prisma.userPreGrant.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: `Pre-grant already exists for ${email}` },
      { status: 409 },
    );
  }

  const grant = await prisma.userPreGrant.create({
    data: {
      email,
      grantRole: (body.grantRole as AssignableRole | undefined) ?? null,
      operatorParkSlug: body.operatorParkSlug ?? null,
      notes: body.notes?.trim() || null,
      createdByUserId: authResult.session.user.id,
    },
  });

  return NextResponse.json({ grant }, { status: 201 });
}
