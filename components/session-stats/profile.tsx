"use client";

import Link from "next/link";
import { designStyles } from "@/components/design";
import { useSessionStats } from "@/hooks/useSessionStats";
import {
  ActivityHeatmap,
  StatsErrorCard,
  StatsLoadingCard,
  HeatLegend,
  formatPercent,
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

  const weeks = Math.max(1, Math.round(stats.trend.length / 7));
  const hours = Math.floor(stats.totalMinutes / 60);
  const mins = stats.totalMinutes % 60;
  const tiles: { label: string; value: string; unit: string }[] = [
    { label: "Completed", value: String(stats.completed), unit: "" },
    {
      label: "Focused time",
      value: String(hours),
      unit: mins ? `h ${mins}m` : "h",
    },
    {
      label: "Attendance",
      value: formatPercent(stats.attendanceRate).replace("%", ""),
      unit: "%",
    },
    {
      label: "Streak",
      value: String(stats.currentStreak),
      unit: stats.currentStreak === 1 ? "day" : "days",
    },
  ];

  return (
    <section className={designStyles.card}>
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 12,
          marginBottom: 18,
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <h2 className={designStyles.cardTitle} style={{ margin: 0 }}>
            Session stats
          </h2>
          <p className={designStyles.cardSub} style={{ margin: "4px 0 0" }}>
            Your focus history over the last {weeks} weeks.
          </p>
        </div>
        <span
          className={designStyles.mono}
          style={{ fontSize: 12, color: "var(--ink-mute)", flexShrink: 0, whiteSpace: "nowrap" }}
        >
          {stats.booked} tracked
        </span>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          borderTop: "1px solid var(--line)",
          borderBottom: "1px solid var(--line)",
          marginBottom: 20,
        }}
      >
        {tiles.map((t) => (
          <div key={t.label} style={{ padding: "14px 16px 14px 0" }}>
            <div
              className={designStyles.mono}
              style={{
                fontSize: 10.5,
                color: "var(--ink-mute)",
                textTransform: "uppercase",
                letterSpacing: "0.04em",
              }}
            >
              {t.label}
            </div>
            <div
              className={designStyles.mono}
              style={{ fontSize: 24, letterSpacing: "-0.02em", marginTop: 4 }}
            >
              {t.value}
              {t.unit ? (
                <span style={{ fontSize: 12, color: "var(--ink-mute)", marginLeft: 3 }}>
                  {t.unit}
                </span>
              ) : null}
            </div>
          </div>
        ))}
      </div>

      <ActivityHeatmap stats={stats} bare />

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 12,
          marginTop: 14,
        }}
      >
        <Link
          href="/dashboard?tab=sessions"
          style={{ fontSize: 13, color: "var(--ink-mute)", textDecoration: "none" }}
        >
          Full session history →
        </Link>
        <HeatLegend />
      </div>
    </section>
  );
}
