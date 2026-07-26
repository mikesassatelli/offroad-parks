"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { WelcomeDialog } from "@/components/welcome/WelcomeDialog";

const STORAGE_KEY = "op-welcome-seen";

const emptySubscribe = () => () => {};

/** True only after client hydration — mirrors the pattern in CookieConsent. */
function useIsMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

function hasSeenWelcome() {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    // localStorage unavailable (e.g. privacy mode) — treat as already seen so
    // we don't auto-open into a broken storage environment.
    return true;
  }
}

function markSeen() {
  try {
    localStorage.setItem(STORAGE_KEY, "1");
  } catch {
    // Ignore write failures — worst case it auto-opens again next visit.
  }
}

interface WelcomeContextValue {
  /** Reopen the welcome dialog on demand (e.g. the footer "How it works" link). */
  openWelcome: () => void;
}

const WelcomeContext = createContext<WelcomeContextValue | null>(null);

/**
 * Owns the welcome dialog: auto-opens it once for first-time visitors (gated by
 * a `localStorage` flag so it never nags), remembers the dismissal, and exposes
 * {@link useWelcome} so anywhere in the app — the footer "How it works" link —
 * can reopen it. Mount once, high in the tree (see the root layout).
 *
 * Follows CookieConsent's pattern: the first-visit flag is read during render
 * behind a mounted guard rather than via `setState` in an effect, so there's no
 * hydration mismatch and no cascading render.
 */
export function WelcomeProvider({ children }: { children: React.ReactNode }) {
  const mounted = useIsMounted();
  const [manualOpen, setManualOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // Auto-open only on the client, only until the visitor dismisses it. The
  // `dismissed` React state is what makes a close re-render: on a first visit
  // `open` is driven purely by `autoOpen`, so `manualOpen` never flipped and a
  // bare `setManualOpen(false)` would be a no-op that React bails out of,
  // leaving the dialog stuck open. Flipping `dismissed` forces the re-render.
  // `hasSeenWelcome()` (short-circuited behind `mounted`, so it never runs on
  // the server) keeps it from auto-opening again on later page loads.
  const autoOpen = mounted && !dismissed && !hasSeenWelcome();
  const open = manualOpen || autoOpen;

  const handleOpenChange = useCallback((next: boolean) => {
    if (next) {
      setManualOpen(true);
    } else {
      markSeen();
      setManualOpen(false);
      setDismissed(true);
    }
  }, []);

  const openWelcome = useCallback(() => setManualOpen(true), []);

  const value = useMemo(() => ({ openWelcome }), [openWelcome]);

  return (
    <WelcomeContext.Provider value={value}>
      {children}
      <WelcomeDialog open={open} onOpenChange={handleOpenChange} />
    </WelcomeContext.Provider>
  );
}

/**
 * Access the welcome dialog controls. Degrades to a no-op if no provider is
 * mounted (e.g. in an isolated unit test) so callers never crash.
 */
export function useWelcome(): WelcomeContextValue {
  return useContext(WelcomeContext) ?? { openWelcome: () => {} };
}
