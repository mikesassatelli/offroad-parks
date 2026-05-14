import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { applyPreGrant } from "@/lib/pre-grant";

export const runtime = "nodejs";

// POST /api/admin/pre-grants/[id]/apply — retroactively apply a pre-grant
// to a user who has already signed in (so the createUser hook never fired
// for them). SUPER_ADMIN only.
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  const grant = await prisma.userPreGrant.findUnique({ where: { id } });
  if (!grant) {
    return NextResponse.json({ error: "Pre-grant not found" }, { status: 404 });
  }

  // Find the user by the grant's email. If they haven't signed in yet,
  // there's nothing to apply — the createUser hook will handle it.
  const targetUser = await prisma.user.findUnique({
    where: { email: grant.email },
    select: { id: true },
  });
  if (!targetUser) {
    return NextResponse.json(
      {
        error: `User with email ${grant.email} has not signed in yet. The grant will apply automatically on their first sign-in.`,
      },
      { status: 409 },
    );
  }

  const result = await applyPreGrant({
    email: grant.email,
    userId: targetUser.id,
  });

  return NextResponse.json({ result });
}
