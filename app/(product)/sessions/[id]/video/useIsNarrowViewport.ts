"use client";

import { useEffect, useState } from "react";

/** Matches the `sm:` Tailwind breakpoint used to split StreamChatPanel (desktop) from StreamChatSheet (mobile). */
const NARROW_BREAKPOINT = 640;

/**
 * Same matchMedia + change-listener pattern as hooks/useIsMobileShell.ts,
 * scoped to the chat panel/sheet split instead of the dashboard shell's
 * breakpoint — lets StreamStage render only one chat surface instead of
 * mounting both and hiding one with CSS.
 */
export function useIsNarrowViewport(): boolean {
  const [isNarrow, setIsNarrow] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${NARROW_BREAKPOINT - 1}px)`);
    const check = () => setIsNarrow(mql.matches);
    check();
    mql.addEventListener("change", check);
    return () => mql.removeEventListener("change", check);
  }, []);

  return isNarrow;
}
