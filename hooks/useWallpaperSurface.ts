"use client";

import { designStyles } from "@/components/design";
import { useWallpaperActive } from "@/components/wallpaper-context";

/** Solid surfaces that follow Shell light/dark tokens (same as Settings cards). */
export function useWallpaperSurface() {
  const wallpaperActive = useWallpaperActive();

  return {
    wallpaperActive,
    card: designStyles.card,
  };
}
