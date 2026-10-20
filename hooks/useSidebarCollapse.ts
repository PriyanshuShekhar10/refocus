"use client";

import { useCallback, useEffect, useState } from "react";

/** Below this width the right sidebar minimises itself, so the calendar keeps its size. */
export const SIDEBAR_AUTO_COLLAPSE_BELOW = 1280;

const STORAGE_KEY = "refocus:right-sidebar";

export type SidebarPreference = "expanded" | "collapsed" | null;

/** A choice the person made by hand always wins; otherwise collapse on narrow screens. */
export function resolveSidebarCollapsed(preference: SidebarPreference, viewportWidth: number): boolean {
  if (preference) return preference === "collapsed";
  return viewportWidth < SIDEBAR_AUTO_COLLAPSE_BELOW;
}

function readPreference(): SidebarPreference {
  try {
    const v = window.localStorage.getItem(STORAGE_KEY);
    return v === "expanded" || v === "collapsed" ? v : null;
  } catch {
    return null;
  }
}

/**
 * Right sidebar collapse state: automatic by screen width until the person
 * expands or collapses it themselves, then their choice sticks (this browser).
 */
export function useSidebarCollapse() {
  const [preference, setPreference] = useState<SidebarPreference>(null);
  // Assume a wide screen until mounted, so server and first client render match.
  const [width, setWidth] = useState(Number.POSITIVE_INFINITY);

  useEffect(() => {
    setPreference(readPreference());
    const onResize = () => setWidth(window.innerWidth);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const setCollapsed = useCallback((collapsed: boolean) => {
    const next: SidebarPreference = collapsed ? "collapsed" : "expanded";
    setPreference(next);
    try {
      window.localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Storage unavailable (private mode): the choice lasts until reload.
    }
  }, []);

  return { isCollapsed: resolveSidebarCollapsed(preference, width), setCollapsed };
}
