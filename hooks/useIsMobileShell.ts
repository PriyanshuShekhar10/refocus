"use client";

import { useEffect, useState } from "react";

export const MOBILE_SHELL_BREAKPOINT = 1024;

export function useIsMobileShell() {
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const check = () => setIsMobile(window.innerWidth < MOBILE_SHELL_BREAKPOINT);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return { isMobile, mounted };
}
