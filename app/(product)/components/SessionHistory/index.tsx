"use client";

import { Shell } from "@/components/design";
import { RecentSessionPartners } from "@/components/recent-session-partners";
import { SessionStatsDashboard } from "@/components/session-stats/dashboard";

export default function SessionHistory() {
  return (
    <Shell>
      <div
        style={{
          padding: "8px 4px",
          maxWidth: 980,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 20,
        }}
      >
        <RecentSessionPartners />
        <SessionStatsDashboard />
      </div>
    </Shell>
  );
}
