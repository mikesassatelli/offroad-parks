"use client";

import Link from "next/link";
import { SessionProvider, useSession } from "next-auth/react";

/**
 * Saved Routes is a signed-in-only destination — `/routes` redirects anonymous
 * visitors straight to sign-in. Rendering it as a client island lets the footer
 * stay a static server component (so the legal/marketing pages keep their static
 * rendering) while still hiding the link from logged-out users.
 */
function FooterRoutesLinkInner() {
  const { data: session } = useSession();

  if (!session?.user) return null;

  return (
    <li>
      <Link href="/routes" className="hover:text-foreground transition-colors">
        Saved routes
      </Link>
    </li>
  );
}

export function FooterRoutesLink() {
  return (
    <SessionProvider>
      <FooterRoutesLinkInner />
    </SessionProvider>
  );
}
