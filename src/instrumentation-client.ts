import * as Sentry from "@sentry/nextjs";

/**
 * Browser error monitoring (OP-100). Inert until NEXT_PUBLIC_SENTRY_DSN is set
 * — see src/instrumentation.ts for the full note. Sentry DSNs are write-only
 * ingest keys and safe to expose to the client.
 */
const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    tracesSampleRate: 0.1,
    // No session replay by default; enable deliberately once live.
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
  });
}

// Enables App Router navigation instrumentation. No-op until init runs.
export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
