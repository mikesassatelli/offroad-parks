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
      /** User role — "USER" | "OPERATOR" | "ADMIN" | "SUPER_ADMIN" | "BETA_TESTER" | undefined */
      role?: string;
    };
  }

  interface User {
    /** User role stored in DB — "USER" | "OPERATOR" | "ADMIN" | "SUPER_ADMIN" | "BETA_TESTER" | null */
    role?: string | null;
  }
}
