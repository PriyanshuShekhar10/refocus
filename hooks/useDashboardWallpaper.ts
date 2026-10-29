"use client";

import { mutate as globalMutate } from "swr";
import { swrKeys } from "@/lib/swr/keys";
import { useUserPreferences, type UserPreferences } from "./useUserPreferences";

export function useDashboardWallpaper() {
  const { preferences, loading } = useUserPreferences();
  const raw = preferences.dashboardWallpaperUrl;
  return {
    wallpaperUrl: raw?.trim() ? raw.trim() : null,
    loaded: !loading,
  };
}

/** Push a freshly-uploaded/removed wallpaper into the shared preferences cache immediately, instead of waiting for a revalidate. */
export function notifyWallpaperPref(wallpaperUrl: string | null) {
  void globalMutate<{ preferences?: Partial<UserPreferences> }>(
    swrKeys.userPreferences,
    (current) => ({
      preferences: { ...(current?.preferences ?? {}), dashboardWallpaperUrl: wallpaperUrl },
    }),
    { revalidate: false },
  );
}
