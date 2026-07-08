"use client";

import { createContext, useContext, type ReactNode } from "react";

const WallpaperContext = createContext(false);

export function WallpaperProvider({
  active,
  children,
}: {
  active: boolean;
  children: ReactNode;
}) {
  return (
    <WallpaperContext.Provider value={active}>{children}</WallpaperContext.Provider>
  );
}

export function useWallpaperActive() {
  return useContext(WallpaperContext);
}
