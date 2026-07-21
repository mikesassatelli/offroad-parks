"use client";

import { useEffect } from "react";

/**
 * Last-resort fallback that replaces the root layout when it throws, so it
 * must render its own <html>/<body>. Global CSS may not be applied here, so
 * styling is kept inline and theme-neutral.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          backgroundColor: "#161311",
          color: "#f0ebe6",
          fontFamily:
            "ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "28rem" }}>
          <p
            style={{
              margin: 0,
              fontSize: "0.75rem",
              fontWeight: 700,
              letterSpacing: "0.15em",
              textTransform: "uppercase",
              color: "#e8763a",
            }}
          >
            Offroad Parks
          </p>
          <h1
            style={{
              margin: "0.75rem 0 0",
              fontSize: "1.75rem",
              fontWeight: 800,
              lineHeight: 1.2,
            }}
          >
            The whole rig broke down.
          </h1>
          <p
            style={{
              margin: "1rem 0 0",
              fontSize: "1rem",
              lineHeight: 1.6,
              color: "#b3aaa2",
            }}
          >
            Something went badly wrong on our end. Try reloading — we&apos;ll get
            back on the trail.
          </p>
          <button
            onClick={() => reset()}
            style={{
              marginTop: "1.75rem",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              height: "2.5rem",
              padding: "0 1.5rem",
              borderRadius: "0.375rem",
              border: "none",
              cursor: "pointer",
              fontSize: "0.875rem",
              fontWeight: 600,
              backgroundColor: "#e8763a",
              color: "#161311",
            }}
          >
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
