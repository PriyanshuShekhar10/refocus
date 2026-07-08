"use client";

import { useCallback, useEffect, useState } from "react";

export const WALLPAPER_PREF_EVENT = "refocus:wallpaper-pref";

export function useDashboardWallpaper() {
  const [wallpaperUrl, setWallpaperUrl] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);

  const apply = useCallback((url: string | null) => {
    setWallpaperUrl(url?.trim() ? url.trim() : null);
    setLoaded(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/preferences");
        if (!res.ok) return;
        const data = await res.json().catch(() => ({}));
        if (cancelled) return;
        const url = data?.preferences?.dashboardWallpaperUrl;
        apply(typeof url === "string" ? url : null);
      } catch {
        if (!cancelled) setLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apply]);

  useEffect(() => {
    const onPref = (e: Event) => {
      const ce = e as CustomEvent<{ wallpaperUrl?: string | null }>;
      if ("wallpaperUrl" in (ce.detail ?? {})) {
        apply(ce.detail?.wallpaperUrl ?? null);
      }
    };
    window.addEventListener(WALLPAPER_PREF_EVENT, onPref);
    return () => window.removeEventListener(WALLPAPER_PREF_EVENT, onPref);
  }, [apply]);

  return { wallpaperUrl, loaded };
}

export function notifyWallpaperPref(wallpaperUrl: string | null) {
  window.dispatchEvent(
    new CustomEvent(WALLPAPER_PREF_EVENT, { detail: { wallpaperUrl } }),
  );
}
