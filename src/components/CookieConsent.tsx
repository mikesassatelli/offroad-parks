"use client";

import { useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "cookie-consent";

const emptySubscribe = () => () => {};

/** True only after client hydration — mirrors the pattern in ThemeToggle. */
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

function hasStoredChoice() {
  try {
    return !!localStorage.getItem(STORAGE_KEY);
  } catch {
    // localStorage unavailable (e.g. privacy mode) — treat as no choice.
    return false;
  }
}

/**
 * Lightweight cookie/consent notice. Privacy-preserving by default: nothing
 * non-essential is assumed until the visitor makes a choice. We currently use
 * only essential auth cookies and cookieless Vercel Analytics, so this is
 * primarily a disclosure — but it records the visitor's choice so we stay
 * compliant if additional cookies are ever introduced.
 */
export function CookieConsent() {
  const mounted = useIsMounted();
  const [dismissed, setDismissed] = useState(false);

  // Read localStorage during render (client-only, behind the mounted guard) so
  // we never call setState inside an effect just to hydrate a browser value.
  if (!mounted || dismissed || hasStoredChoice()) return null;

  const choose = (value: "accepted" | "declined") => {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // ignore write failures
    }
    setDismissed(true);
  };

  return (
    <div
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-card/95 backdrop-blur-sm shadow-lg"
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col sm:flex-row sm:items-center gap-3">
        <p className="text-sm text-muted-foreground flex-1 leading-6">
          We use essential cookies to keep you signed in and privacy-friendly
          analytics to improve the site. See our{" "}
          <Link href="/legal/privacy" className="text-primary underline">
            Privacy Policy
          </Link>
          .
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="sm" onClick={() => choose("declined")}>
            Decline non-essential
          </Button>
          <Button size="sm" onClick={() => choose("accepted")}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
