"use client";

import { useWelcome } from "@/components/welcome/WelcomeProvider";

/**
 * Footer entry point that reopens the {@link WelcomeDialog} on demand, so the
 * first-run tour is never lost after it's dismissed. Client-only because it
 * needs the welcome context; the footer itself stays a server component.
 */
export function WelcomeFooterLink({ className }: { className?: string }) {
  const { openWelcome } = useWelcome();
  return (
    <button
      type="button"
      onClick={openWelcome}
      className={className ?? "hover:text-foreground transition-colors"}
    >
      How it works
    </button>
  );
}
