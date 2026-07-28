"use client";

import { useSession } from "next-auth/react";
import { AppHeader } from "./AppHeader";

/**
 * AppHeader for the auth-less fallbacks (loading.tsx / error.tsx /
 * not-found.tsx) that have no server-fetched `user` to pass. It reads the
 * cached client session instead, so the header keeps its signed-in state
 * during navigation rather than flashing the signed-out navbar.
 *
 * Regular pages should keep passing the server `user` prop to AppHeader
 * directly — that renders correctly on the first paint with no client fetch.
 */
export function SessionAppHeader({
  showBackButton,
}: {
  showBackButton?: boolean;
}) {
  const { data: session } = useSession();
  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image,
        role: session.user.role,
      }
    : null;

  return <AppHeader user={user} showBackButton={showBackButton} />;
}
