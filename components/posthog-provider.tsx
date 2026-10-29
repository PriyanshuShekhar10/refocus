"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";
import posthog from "posthog-js";

const key = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim();
const host =
  process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com";

let initialized = false;

function ensureInit() {
  if (initialized || !key || typeof window === "undefined") return;
  // Skip noisy local events unless explicitly enabled.
  if (
    process.env.NODE_ENV === "development" &&
    process.env.NEXT_PUBLIC_POSTHOG_DEBUG !== "1"
  ) {
    return;
  }
  posthog.init(key, {
    api_host: host,
    defaults: "2026-05-30",
    cross_subdomain_cookie: true,
    persistence: "localStorage+cookie",
    capture_pageview: true,
    capture_pageleave: true,
    // Error tracking: uncaught errors and unhandled promise rejections,
    // linked to the session replay.
    capture_exceptions: true,
    disable_session_recording: false,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: ".ph-no-capture",
    },
    before_send: (event) => {
      // Browser-internal, functionally harmless — doesn't indicate anything
      // broke. Not worth tracking as an application error.
      if (event?.event === "$exception") {
        const message = String(
          (event.properties?.$exception_list as Array<{ value?: string }> | undefined)?.[0]?.value ?? "",
        );
        if (message.includes("ResizeObserver loop completed with undelivered notifications")) {
          return null;
        }
      }
      return event;
    },
  });
  initialized = true;
}

/**
 * PostHog for the dashboard host. Uses the same project + cross-subdomain
 * cookie as the Astro marketing site so blog → signup → product is one journey.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();

  useEffect(() => {
    ensureInit();
  }, []);

  useEffect(() => {
    if (!initialized) return;
    if (status === "authenticated" && session?.user) {
      const id =
        (session.user as { id?: string }).id ||
        session.user.email ||
        undefined;
      if (id) {
        posthog.identify(id, {
          email: session.user.email ?? undefined,
          name: session.user.name ?? undefined,
        });
      }
    }
    if (status === "unauthenticated") {
      posthog.reset();
    }
  }, [session, status]);

  return <>{children}</>;
}
