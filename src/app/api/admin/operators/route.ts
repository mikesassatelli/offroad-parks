/**
 * Admin endpoints for park-operator management (ADMIN + SUPER_ADMIN).
 *
 * Operators are normally created via the ParkClaim approval flow. This
 * surface is for direct admin maintenance — onboarding a paid operator
 * without a claim, fixing data, transferring parks, etc.
 */
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/api-helpers";

export const runtime = "nodejs";

// GET /api/admin/operators — list all operators with their parks + users.
export async function GET(): Promise<NextResponse> {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  const operators = await prisma.operator.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      parks: {
        select: { id: true, slug: true, name: true },
        orderBy: { name: "asc" },
      },
      users: {
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: { id: true, email: true, name: true, image: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  return NextResponse.json({ operators });
}

interface CreateOperatorBody {
  name?: string;
  email?: string;
  phone?: string | null;
  website?: string | null;
  // Optional convenience: attach an initial park + initial OWNER in the
  // same call so the admin doesn't have to fire 3 requests in a row.
  initialParkSlug?: string | null;
  initialOwnerEmail?: string | null;
}

// POST /api/admin/operators — create a new operator.
//
// Body: { name, email, phone?, website?, initialParkSlug?, initialOwnerEmail? }
//   - initialParkSlug, when set, attaches the park to the new operator
//     (only valid if the park has no operator yet; 409 otherwise).
//   - initialOwnerEmail, when set, creates an OperatorUser as OWNER for
//     the existing User with that email. If no User exists yet, the call
//     succeeds but skips the user grant (a pre-grant is the better
//     mechanism for that case — see /admin/pre-grants).
export async function POST(request: Request): Promise<NextResponse> {
  const authResult = await requireAdmin();
  if (authResult instanceof NextResponse) return authResult;

  let body: CreateOperatorBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const name = body.name?.trim();
  const email = body.email?.trim().toLowerCase();
  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json(
      { error: "Valid email is required" },
      { status: 400 },
    );
  }

  // Validate park if provided.
  let parkId: string | null = null;
  if (body.initialParkSlug) {
    const park = await prisma.park.findUnique({
      where: { slug: body.initialParkSlug },
      select: { id: true, operatorId: true },
    });
    if (!park) {
      return NextResponse.json(
        { error: `Park '${body.initialParkSlug}' not found` },
        { status: 400 },
      );
    }
    if (park.operatorId) {
      return NextResponse.json(
        {
          error: `Park '${body.initialParkSlug}' already has an operator. Detach it first or pick a different park.`,
        },
        { status: 409 },
      );
    }
    parkId = park.id;
  }

  // Resolve initial owner user if provided.
  let ownerUserId: string | null = null;
  if (body.initialOwnerEmail) {
    const user = await prisma.user.findUnique({
      where: { email: body.initialOwnerEmail.trim().toLowerCase() },
      select: { id: true },
    });
    if (user) {
      ownerUserId = user.id;
    }
    // If user doesn't exist, we silently skip — admin can use Pre-grants
    // to wire them up at first sign-in. We return a hint in the response
    // so the UI can surface this.
  }

  let operatorId: string;
  try {
    const result = await prisma.$transaction(async (tx) => {
      const operator = await tx.operator.create({
        data: {
          name,
          email,
          phone: body.phone?.trim() || null,
          website: body.website?.trim() || null,
        },
      });

      if (ownerUserId) {
        await tx.operatorUser.create({
          data: {
            operatorId: operator.id,
            userId: ownerUserId,
            role: "OWNER",
          },
        });
      }

      if (parkId) {
        await tx.park.update({
          where: { id: parkId },
          data: { operatorId: operator.id },
        });
      }

      return operator;
    });
    operatorId = result.id;
  } catch (err) {
    // Unique constraint on Operator.email.
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
      return NextResponse.json(
        { error: `An operator with email '${email}' already exists.` },
        { status: 409 },
      );
    }
    throw err;
  }

  const operator = await prisma.operator.findUnique({
    where: { id: operatorId },
    include: {
      parks: {
        select: { id: true, slug: true, name: true },
        orderBy: { name: "asc" },
      },
      users: {
        select: {
          id: true,
          role: true,
          createdAt: true,
          user: {
            select: { id: true, email: true, name: true, image: true },
          },
        },
      },
    },
  });

  return NextResponse.json(
    {
      operator,
      hints: {
        ownerEmailSkipped:
          !!body.initialOwnerEmail && !ownerUserId
            ? `User with email '${body.initialOwnerEmail}' does not exist yet. Create a Pre-grant if you want operator access wired automatically on their first sign-in.`
            : null,
      },
    },
    { status: 201 },
  );
}
