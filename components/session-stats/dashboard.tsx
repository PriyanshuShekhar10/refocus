"use client";

import Link from "next/link";
import { designStyles } from "@/components/design";
import { useSessionStats } from "@/hooks/useSessionStats";
import {
  SessionStatsDetails,
  StatsErrorCard,
  StatsLoadingCard,
  StatsSummaryLine,
} from "@/components/session-stats/shared";

export function SessionStatsDashboard() {
  const { stats, loading, error } = useSessionStats();

  if (loading) {
    return <StatsLoadingCard subtitle="Loading session history…" />;
  }

  if (error || !stats) {
    return (
      <StatsErrorCard message={error ?? "Session stats are unavailable right now."} />
    );
  }

  if (stats.booked === 0) {
    return (
      <section className={designStyles.card}>
        <h2 className={designStyles.cardTitle} style={{ margin: 0 }}>
          Session history
        </h2>
        <p className={designStyles.cardSub} style={{ margin: "6px 0 0" }}>
          Book and complete your first focus session to see detailed stats here.
        </p>
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
            marginTop: 14,
            alignItems: "center",
            gap: 6,
            fontSize: 14,
            color: "var(--ink)",
            textDecoration: "none",
            padding: "8px 14px",
            borderRadius: 999,
            border: "1px solid var(--line)",
            width: "fit-content",
          }}
        >
          Book a session →
        </Link>
      </section>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <section className={designStyles.card}>
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 8,
          }}
        >
          <div>
            <h2 className={designStyles.cardTitle} style={{ margin: 0 }}>
              Session history
            </h2>
            <p className={designStyles.cardSub} style={{ margin: "6px 0 0" }}>
              How often you show up, follow through, and who you focus with.
            </p>
          </div>
          <span style={{ fontSize: 12, color: "var(--ink-mute)", flexShrink: 0 }}>
            {stats.booked} tracked
          </span>
        </div>
        <StatsSummaryLine stats={stats} />
      </section>

      <section className={designStyles.card}>
        <SessionStatsDetails stats={stats} />
      </section>
    </div>
  );
}
