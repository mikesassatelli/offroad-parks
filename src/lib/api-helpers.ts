/**
 * Shared API route helpers — auth guards and response utilities.
 * Use these in API routes to reduce boilerplate.
 */
import { NextResponse } from "next/server";
import type { Session } from "next-auth";
import { auth } from "@/lib/auth";

/** A session that is guaranteed to have a user (post-auth-guard). */
type AuthenticatedSession = Session & { user: NonNullable<Session["user"]> };

/** Roles that grant access to the admin console. */
const ADMIN_ROLES = new Set(["ADMIN", "SUPER_ADMIN"]);

/**
 * Verify the request comes from an authenticated admin (ADMIN or SUPER_ADMIN).
 * Returns the session on success, or a NextResponse 401/403 on failure.
 *
 * Usage:
 *   const result = await requireAdmin();
 *   if (result instanceof NextResponse) return result;
 *   const session = result; // authenticated admin session
 */
export async function requireAdmin(): Promise<AuthenticatedSession | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!ADMIN_ROLES.has(session.user.role ?? "")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session as AuthenticatedSession;
}

/**
 * Verify the request comes from an authenticated SUPER_ADMIN user.
 * Used for actions only the super admin may take (e.g. promoting/demoting admins).
 */
export async function requireSuperAdmin(): Promise<AuthenticatedSession | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session as AuthenticatedSession;
}

/**
 * Verify the request comes from an authenticated user (any role).
 * Returns the session on success, or a NextResponse 401 on failure.
 */
export async function requireAuth(): Promise<AuthenticatedSession | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session as AuthenticatedSession;
}
