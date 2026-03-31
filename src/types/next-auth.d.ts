// Augment NextAuth session and user types to include role
// This eliminates all @ts-expect-error comments for session.user.role
import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      /** User role — "ADMIN" for admins, undefined for regular users */
      role?: string;
    };
  }

  interface User {
    /** User role stored in DB — "ADMIN" or null */
    role?: string | null;
  }
}
