"use client";

import { useEffect } from "react";
import posthog from "posthog-js";
import { recoverFromChunkLoadError } from "@/lib/chunkLoadErrorRecovery";

/** Last-resort boundary when the root layout itself fails: report and offer a retry. */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    posthog.captureException(error, { $exception_source: "global-error-boundary", error_digest: error.digest });
    recoverFromChunkLoadError(error);
  }, [error]);

  return (
    <html lang="en">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f2efe7", color: "#0a0a0a" }}>
        <main style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 420, textAlign: "center" }}>
            <h1 style={{ fontSize: 20, margin: 0 }}>Something went wrong</h1>
            <p style={{ fontSize: 14, color: "#4a4a47", marginTop: 8 }}>
              We&apos;ve been notified. Please try again.
            </p>
            <button
              type="button"
              onClick={reset}
              style={{ marginTop: 20, padding: "8px 16px", borderRadius: 10, border: 0, background: "#3368A0", color: "#fff", fontWeight: 600, cursor: "pointer" }}
            >
              Try again
            </button>
          </div>
        </main>
      </body>
    </html>
  );
}
