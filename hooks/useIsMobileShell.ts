"use client";

import { useEffect, useState } from "react";

export const MOBILE_SHELL_BREAKPOINT = 1024;

export function useIsMobileShell() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // matchMedia tracks the same layout-viewport breakpoint Tailwind's `lg:`
    // classes use. Reading window.innerWidth directly can disagree with that
    // CSS media query while the page is pinch-zoomed on mobile Safari,
    // leaving the shell stuck between the mobile and desktop layouts.
    const mql = window.matchMedia(`(max-width: ${MOBILE_SHELL_BREAKPOINT - 1}px)`);
    const check = () => setIsMobile(mql.matches);
    check();
    mql.addEventListener("change", check);
    return () => mql.removeEventListener("change", check);
  }, []);

  return { isMobile, mounted };
}
