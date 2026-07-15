import * as Sentry from "@sentry/nextjs";

/**
 * Server + edge error monitoring (OP-100).
 *
 * Wired but INERT until a Sentry project exists: `Sentry.init` only runs when
 * NEXT_PUBLIC_SENTRY_DSN is set. Drop the DSN into the Vercel env to activate —
 * no code change needed. Source-map upload (for readable stack traces) is a
 * follow-up that needs `withSentryConfig` + SENTRY_AUTH_TOKEN/org/project.
 */
export function register() {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    // Conservative default; tune once real traffic volume is known.
    tracesSampleRate: 0.1,
  });
}

// Next.js calls this on every server/edge request error. No-op until init runs.
export const onRequestError = Sentry.captureRequestError;
