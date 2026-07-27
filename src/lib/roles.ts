/**
 * Central role helpers for the admin console.
 *
 * Two distinct capabilities gate the admin area:
 *   - VIEW  — can open admin pages and read admin data (GET endpoints).
 *   - WRITE — can perform mutating admin actions (POST/PATCH/PUT/DELETE).
 *
 * BETA_TESTER has VIEW but not WRITE: a read-only tour of the admin tooling.
 * Every mutating guard must use the WRITE set (`ADMIN_ROLES`) so beta testers
 * are rejected server-side; page/GET guards use the VIEW set. The read-only UI
 * (greyed buttons + "view-only" popover) is driven by `isReadOnlyAdmin`, but is
 * cosmetic only — the server is the source of truth.
 */

/** Roles allowed to perform mutating admin actions. */
export const ADMIN_ROLES = ["ADMIN", "SUPER_ADMIN"] as const;

/** Roles allowed to VIEW the admin console (includes read-only beta testers). */
export const ADMIN_VIEW_ROLES = [...ADMIN_ROLES, "BETA_TESTER"] as const;

/** True if the role may perform mutating admin actions. */
export function canAdminWrite(role: string | null | undefined): boolean {
  return role != null && (ADMIN_ROLES as readonly string[]).includes(role);
}

/** True if the role may view the admin console (write access or read-only). */
export function canAdminView(role: string | null | undefined): boolean {
  return role != null && (ADMIN_VIEW_ROLES as readonly string[]).includes(role);
}

/**
 * True if the role can view but NOT modify the admin console. Drives the
 * read-only UI treatment (disabled controls + "view-only" popover).
 */
export function isReadOnlyAdmin(role: string | null | undefined): boolean {
  return canAdminView(role) && !canAdminWrite(role);
}

/** Shared copy for the read-only popover / banner. */
export const READ_ONLY_ADMIN_MESSAGE =
  "You have view-only beta access — admin actions are disabled.";
