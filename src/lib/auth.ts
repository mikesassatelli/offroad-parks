import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";
import { applyPreGrantForNewUser } from "@/lib/pre-grant";
import GoogleProvider from "next-auth/providers/google";
import ResendProvider from "next-auth/providers/resend";
import { sendEmail, EMAIL_FROM } from "@/lib/email/send";
import { renderMagicLinkEmail } from "@/lib/email/templates";
import type { NextAuthConfig, Session, User } from "next-auth";

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
    // Passwordless email magic-link (OP-97). The `apiKey` here satisfies the
    // provider's config shape, but sending is fully delegated to our shared
    // `sendEmail` (OP-96), which uses Resend when RESEND_API_KEY is set and a
    // console fallback otherwise — so local dev needs no key (the sign-in link
    // is logged to the server console).
    ResendProvider({
      apiKey: process.env.RESEND_API_KEY ?? "dev-no-key",
      from: EMAIL_FROM,
      async sendVerificationRequest({ identifier, url }) {
        const { host } = new URL(url);
        const { subject, html, text } = renderMagicLinkEmail({ url, host });
        await sendEmail({ to: identifier, subject, html, text });
      },
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
