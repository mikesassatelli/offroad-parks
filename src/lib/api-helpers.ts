/**
 * Shared API route helpers — auth guards and response utilities.
 * Use these in API routes to reduce boilerplate.
 */
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

/** Auth session type from next-auth */
type AuthSession = Awaited<ReturnType<typeof auth>>;

/**
 * Verify the request comes from an authenticated ADMIN user.
 * Returns the session on success, or a NextResponse 401/403 on failure.
 *
 * Usage:
 *   const result = await requireAdmin();
 *   if (result instanceof NextResponse) return result;
 *   const session = result; // authenticated admin session
 */
export async function requireAdmin(): Promise<
  AuthSession & { user: NonNullable<NonNullable<AuthSession>["user"]> } | NextResponse
> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return session as AuthSession & { user: NonNullable<NonNullable<AuthSession>["user"]> };
}

/**
 * Verify the request comes from an authenticated user (any role).
 * Returns the session on success, or a NextResponse 401 on failure.
 */
export async function requireAuth(): Promise<
  AuthSession & { user: NonNullable<NonNullable<AuthSession>["user"]> } | NextResponse
> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return session as AuthSession & { user: NonNullable<NonNullable<AuthSession>["user"]> };
}
