"use client";

import { useEffect } from "react";

const MARKETING_HOME = "https://refocus.co.in/";

/**
 * Keeps dashboard `/` as a real HTML document (so GA is detectable), then
 * sends browsers to the marketing apex.
 */
export function SoftRedirectToMarketing() {
  useEffect(() => {
    window.location.replace(MARKETING_HOME);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center bg-neutral-50 px-4 text-neutral-800">
      <p className="text-sm text-neutral-600">
        Taking you to{" "}
        <a className="underline underline-offset-2" href={MARKETING_HOME}>
          Refocus
        </a>
        …
      </p>
    </main>
  );
}
