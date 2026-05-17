"use client";

import { Shell } from "@/components/design";
import { ProfileView } from "@/components/profile-view";

export default function Profile() {
  return (
    <Shell>
      <div style={{ padding: "8px 4px", maxWidth: 980, margin: "0 auto" }}>
        <ProfileView embedded />
      </div>
    </Shell>
  );
}
