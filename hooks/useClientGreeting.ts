"use client";

import { useEffect, useState } from "react";

function computeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

function computeDateLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

/**
 * Greeting text + a "Weekday, Mon D" date label, read from the visitor's
 * local clock. Evaluating `new Date()` directly during render makes SSR
 * (server's clock/timezone) and the client's first hydration render
 * (visitor's clock/timezone) disagree whenever they land in different
 * hour/day buckets — this was React's "Minified error #418" hydration
 * mismatch, concentrated on /dashboard. Same mounted-gate fix as
 * hooks/useIsMobileShell.ts: SSR and the client's first render both get a
 * fixed, time-independent placeholder, then the real value swaps in right
 * after mount via a normal (non-hydration-checked) re-render.
 */
export function useClientGreeting(): { greeting: string; dateLabel: string } {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return { greeting: "Hello", dateLabel: "" };
  return { greeting: computeGreeting(), dateLabel: computeDateLabel() };
}
