import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

const ASSIGNABLE_ROLES = ["USER", "OPERATOR", "ADMIN", "SUPER_ADMIN"] as const;
type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

// PATCH /api/admin/users/[id]/role — only SUPER_ADMIN may promote/demote users.
export async function PATCH(
  request: Request,
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

  let body: { role?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const role = body.role;
  if (!role || !ASSIGNABLE_ROLES.includes(role as AssignableRole)) {
    return NextResponse.json(
      { error: `Invalid role. Must be one of: ${ASSIGNABLE_ROLES.join(", ")}` },
      { status: 400 },
    );
  }

  // Prevent the super admin from demoting themselves and locking the org out
  // of role administration. They can be demoted by another super admin.
  if (id === session.user.id && role !== "SUPER_ADMIN") {
    return NextResponse.json(
      { error: "Super admins cannot demote themselves" },
      { status: 400 },
    );
  }

  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!target) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const updated = await prisma.user.update({
    where: { id },
    data: { role: role as AssignableRole },
    select: { id: true, email: true, name: true, role: true },
  });

  return NextResponse.json(updated);
}
