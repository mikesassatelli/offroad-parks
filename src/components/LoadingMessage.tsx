"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

/**
 * Fun, offroad-flavored loading phrases. One is picked at random each time the
 * indicator mounts (fresh on every client navigation).
 */
const MESSAGES = [
  "Firing up the engine…",
  "Airing down…",
  "Unspooling the winch…",
  "Scouting ahead…",
  "Kicking up dust…",
  "Locking the diffs…",
  "Checking the map…",
  "Fueling up…",
  "Slinging mud…",
  "Chasing the ridgeline…",
  "Gearing up…",
  "Picking a line…",
];

export function LoadingMessage() {
  // Lazy initializer runs once per mount — a new phrase each time the loading
  // state appears, without a setState-in-effect. The server and first client
  // paint may differ, so the text node opts out of hydration warnings.
  const [message] = useState(
    () => MESSAGES[Math.floor(Math.random() * MESSAGES.length)],
  );

  return (
    <div
      className="flex flex-col items-center gap-4 text-center"
      role="status"
      aria-live="polite"
    >
      <Loader2 className="w-10 h-10 text-primary animate-spin" />
      <p
        className="text-sm font-medium text-muted-foreground"
        suppressHydrationWarning
      >
        {message}
      </p>
      <span className="sr-only">Loading</span>
    </div>
  );
}
