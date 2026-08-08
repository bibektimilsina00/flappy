"use client";

// App Router global error boundary — replaces the root layout when an uncaught
// render error bubbles to the top, so it must render its own <html>/<body>.
// Reports the error to PostHog error tracking, then offers a retry.
import posthog from "posthog-js";
import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    posthog.captureException(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          margin: 0,
          background: "#0b0b0d",
          color: "#e5e5e5",
          fontFamily: "system-ui, -apple-system, sans-serif",
        }}
      >
        <main style={{ textAlign: "center", padding: "2rem", maxWidth: "28rem" }}>
          <h1 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0 }}>Something went wrong</h1>
          <p style={{ marginTop: "0.75rem", color: "#a1a1a1" }}>
            An unexpected error occurred. We've been notified — please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              padding: "0.6rem 1.25rem",
              borderRadius: "0.5rem",
              border: "none",
              background: "#14b8a6",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
