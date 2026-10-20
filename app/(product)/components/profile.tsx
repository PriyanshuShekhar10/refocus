"use client";

import { Shell } from "@/components/design";
import { ProfileView } from "@/components/profile-view";
import { useWallpaperActive } from "@/components/wallpaper-context";
import { useIsMobileShell } from "@/hooks/useIsMobileShell";

export default function Profile() {
  const wallpaperActive = useWallpaperActive();
  const { isMobile } = useIsMobileShell();

  return (
    <Shell transparent={wallpaperActive}>
      <div style={{ padding: isMobile ? "8px 4px" : 0, maxWidth: 980, margin: "0 auto" }}>
        <ProfileView embedded />
      </div>
    </Shell>
  );
}
