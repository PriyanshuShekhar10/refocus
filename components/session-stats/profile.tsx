"use client";

import Link from "next/link";
import { designStyles } from "@/components/design";
import { useSessionStats } from "@/hooks/useSessionStats";
import {
  ActivityHeatmap,
  StatsErrorCard,
  StatsLoadingCard,
  StatsSummaryLine,
} from "@/components/session-stats/shared";

export function ProfileStats() {
  const { stats, loading, error } = useSessionStats();

  if (loading) {
    return <StatsLoadingCard subtitle="Loading your session history…" />;
  }

  if (error || !stats) {
    return (
      <StatsErrorCard message={error ?? "Stats are unavailable right now."} />
    );
  }

  if (stats.booked === 0) {
    return (
      <section className={designStyles.card}>
        <h2 className={designStyles.cardTitle} style={{ margin: 0 }}>
          Session stats
        </h2>
        <p className={designStyles.cardSub} style={{ margin: "6px 0 0" }}>
          Complete your first session to start tracking focus history.
        </p>
        <Link
          href="/dashboard?tab=sessions"
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
          View sessions →
        </Link>
      </section>
    );
  }

  return (
    <section className={designStyles.card}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className={designStyles.cardTitle} style={{ margin: 0 }}>
            Session stats
          </h2>
          <StatsSummaryLine stats={stats} />
        </div>
        <span style={{ fontSize: 12, color: "var(--ink-mute)", flexShrink: 0 }}>
          {stats.booked} tracked
        </span>
      </div>

      <ActivityHeatmap stats={stats} />

      <Link
        href="/dashboard?tab=sessions"
        style={{
          display: "inline-flex",
          marginTop: 14,
          fontSize: 13,
          color: "var(--ink-mute)",
          textDecoration: "none",
        }}
      >
        Full session history →
      </Link>
    </section>
  );
}
