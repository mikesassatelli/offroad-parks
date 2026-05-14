/**
 * POST — add a user (by email) to an operator account.
 *
 * The user must already exist in `User`. If they haven't signed in yet,
 * use the Pre-grant flow (/admin/pre-grants) so they get auto-wired on
 * their first sign-in.
 */
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

const OPERATOR_USER_ROLES = ["OWNER", "MEMBER"] as const;
type OperatorUserRole = (typeof OPERATOR_USER_ROLES)[number];

interface AddOperatorUserBody {
  email?: string;
  role?: string;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const { id: operatorId } = await params;

  let body: AddOperatorUserBody;
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

  const role = (body.role ?? "OWNER") as OperatorUserRole;
  if (!OPERATOR_USER_ROLES.includes(role)) {
    return NextResponse.json(
      { error: `Role must be one of: ${OPERATOR_USER_ROLES.join(", ")}` },
      { status: 400 },
    );
  }

  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    select: { id: true },
  });
  if (!operator) {
    return NextResponse.json({ error: "Operator not found" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json(
      {
        error: `No user with email '${email}' has signed in yet. Use Pre-grants to wire them up at first sign-in.`,
      },
      { status: 404 },
    );
  }

  try {
    const operatorUser = await prisma.operatorUser.create({
      data: {
        operatorId,
        userId: user.id,
        role,
      },
      include: {
        user: { select: { id: true, email: true, name: true, image: true } },
      },
    });
    return NextResponse.json({ operatorUser }, { status: 201 });
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: "User is already a member of this operator" },
        { status: 409 },
      );
    }
    throw err;
  }
}
