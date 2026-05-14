import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { applyPreGrantForNewUser } from "@/lib/pre-grant";
import GoogleProvider from "next-auth/providers/google";
import type { NextAuthConfig, Session, User } from "next-auth";

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  trustHost: true,
  callbacks: {
    async session({
      session,
      user,
    }: {
      session: Session;
      user: User;
    }): Promise<Session> {
      if (session.user) {
        session.user.id = user.id ?? "";
        session.user.role = user.role ?? undefined;
      }
      return session;
    },
  },
  events: {
    // Fires the first time a user signs in (after PrismaAdapter has
    // inserted the row). Resolves any `UserPreGrant` by email and applies
    // it — sets role and/or wires operator membership. Errors are caught
    // inside the helper so sign-in is never blocked by a pre-grant glitch.
    async createUser({ user }) {
      if (!user.email || !user.id) return;
      await applyPreGrantForNewUser({ email: user.email, userId: user.id });
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
