"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

/** Something in the signed-in app crashed: report it and offer a retry. */
export default function ProductError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    posthog.captureException(error, { $exception_source: "react-error-boundary", error_digest: error.digest });
  }, [error]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[14px] border border-rf-line bg-rf-card p-6 text-center">
        <h1 className="text-lg font-semibold text-rf-ink">Something went wrong</h1>
        <p className="mt-2 text-sm text-rf-ink-soft">
          We&apos;ve been notified. Try again, and if it keeps happening, use Help and feedback to tell us.
        </p>
        <button
          type="button"
          onClick={reset}
          className="mt-5 rounded-[10px] bg-rf-primary px-4 py-2 text-sm font-semibold text-rf-on-primary hover:bg-rf-primary-hover"
        >
          Try again
        </button>
      </div>
    </div>
  );
}
