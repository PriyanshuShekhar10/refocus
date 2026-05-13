"use client";

import { useTheme } from "next-themes";
import { useLayoutEffect, useRef } from "react";

/**
 * Homepage only: keeps Tailwind dark mode off the document root without
 * changing the stored theme, so returning to the app still respects the
 * user's light/dark preference.
 */
export function LandingLightLock({ children }: { children: React.ReactNode }) {
  const { resolvedTheme } = useTheme();
  const resolvedRef = useRef(resolvedTheme);
  resolvedRef.current = resolvedTheme;

  useLayoutEffect(() => {
    const root = document.documentElement;
    const stripDark = () => root.classList.remove("dark");

    stripDark();

    const observer = new MutationObserver(() => {
      if (root.classList.contains("dark")) stripDark();
    });
    observer.observe(root, { attributes: true, attributeFilter: ["class"] });

    return () => {
      observer.disconnect();
      const root = document.documentElement;
      let resolved = resolvedRef.current;
      if (resolved !== "dark" && resolved !== "light") {
        try {
          const stored = window.localStorage.getItem("theme") ?? "system";
          if (stored === "dark") resolved = "dark";
          else if (stored === "light") resolved = "light";
          else
            resolved = window.matchMedia("(prefers-color-scheme: dark)")
              .matches
              ? "dark"
              : "light";
        } catch {
          resolved = "light";
        }
      }
      root.classList.remove("light", "dark");
      root.classList.add(resolved);
    };
  }, []);

  return <>{children}</>;
}
