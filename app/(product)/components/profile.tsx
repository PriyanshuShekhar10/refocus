"use client";

import { Shell } from "@/components/design";
import { ProfileView } from "@/components/profile-view";
import { useWallpaperActive } from "@/components/wallpaper-context";

export default function Profile() {
  const wallpaperActive = useWallpaperActive();

  return (
    <Shell transparent={wallpaperActive}>
      <div style={{ padding: "8px 4px", maxWidth: 980, margin: "0 auto" }}>
        <ProfileView embedded />
      </div>
    </Shell>
  );
}
