import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
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
  callbacks: {
    async session({
      session,
      user,
    }: {
      session: Session;
      user: User;
    }): Promise<Session> {
      if (session.user) {
        session.user.id = user.id;
        // @ts-expect-error - role doesn't exist on default session type
        session.user.role = user.role;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
