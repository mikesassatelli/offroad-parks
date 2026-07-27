"use client";

import {
  createContext,
  useContext,
  type ReactNode,
} from "react";
import { Eye } from "lucide-react";
import { READ_ONLY_ADMIN_MESSAGE } from "@/lib/roles";

/**
 * Read-only admin UI primitives.
 *
 * When a BETA_TESTER opens the admin console the whole tree is put in
 * read-only mode. Mutating controls get wrapped in <ReadOnlyGate> which greys
 * them out, swallows clicks, and shows a "view-only" popover on hover.
 * Navigation, filtering and search controls are left alone so beta testers can
 * still explore. Server-side guards (requireAdmin) are the real enforcement —
 * this layer is purely UX.
 */

const AdminReadOnlyContext = createContext(false);

/** Provides the read-only flag to every admin client component. */
export function AdminReadOnlyProvider({
  isReadOnly,
  children,
}: {
  isReadOnly: boolean;
  children: ReactNode;
}) {
  return (
    <AdminReadOnlyContext.Provider value={isReadOnly}>
      {children}
    </AdminReadOnlyContext.Provider>
  );
}

/** True when the current viewer has view-only (beta tester) admin access. */
export function useAdminReadOnly(): boolean {
  return useContext(AdminReadOnlyContext);
}

/**
 * Wraps a mutating control (button, form, link that performs an action). In
 * read-only mode it renders the child greyed and inert, and shows a popover on
 * hover explaining that the viewer only has view access. Outside read-only
 * mode it renders the child untouched.
 *
 * Interaction is blocked with `inert` on an inner wrapper (removes the subtree
 * from tab order and swallows pointer/keyboard events) while the outer wrapper
 * keeps pointer events so the hover popover still fires.
 */
export function ReadOnlyGate({
  children,
  message = READ_ONLY_ADMIN_MESSAGE,
  className = "",
  block = false,
}: {
  children: ReactNode;
  /** Popover copy. Defaults to the shared view-only message. */
  message?: string;
  /** Extra classes on the outer wrapper. */
  className?: string;
  /** Use an inline-block wrapper instead of inline-flex (for block controls). */
  block?: boolean;
}) {
  const isReadOnly = useAdminReadOnly();

  if (!isReadOnly) return <>{children}</>;

  return (
    <span
      className={`group/readonly relative ${
        block ? "inline-block" : "inline-flex"
      } cursor-not-allowed align-middle ${className}`}
    >
      {/*
        `inert` makes the subtree non-interactive and non-focusable; opacity +
        cursor communicate "disabled". The wrapper span above still receives
        hover, which drives the popover below.
      */}
      <span inert aria-hidden="true" className="pointer-events-none opacity-50">
        {children}
      </span>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-56 -translate-x-1/2 rounded-md border border-border bg-popover px-3 py-2 text-xs font-medium text-popover-foreground shadow-md group-hover/readonly:block"
      >
        {message}
      </span>
    </span>
  );
}

/**
 * Sticky banner shown at the top of the admin console for read-only viewers.
 */
export function ReadOnlyBanner() {
  return (
    <div className="flex items-center gap-2 border-b border-amber-300 bg-amber-50 px-4 py-2 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200">
      <Eye className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
      <span>
        <strong className="font-semibold">View-only beta access.</strong> You
        can browse the admin tooling, but actions are disabled.
      </span>
    </div>
  );
}
