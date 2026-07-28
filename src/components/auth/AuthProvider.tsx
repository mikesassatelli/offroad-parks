"use client";

import { SessionProvider } from "next-auth/react";

/**
 * App-wide client session context. Mounted once in the root layout so the
 * signed-in state persists across client-side navigations — without it, the
 * `loading.tsx` fallback (and error/not-found pages) render a header with no
 * server `user` prop and briefly flash the signed-out navbar mid-navigation.
 *
 * Intentionally unseeded: not passing a server session keeps the root layout
 * statically renderable (no `auth()` call), and the session is fetched once
 * client-side then cached for the session's lifetime.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  return <SessionProvider>{children}</SessionProvider>;
}
