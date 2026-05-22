"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { designStyles } from "@/components/design";

type RecentSession = {
  id: string;
  start: string;
  durationMin: number;
  sessionType: string;
  name: string | null;
  attended: boolean;
  completed: boolean;
  solo: boolean;
};

type TrendDay = { date: string; sessions: number; minutes: number };

type Stats = {
  booked: number;
  attended: number;
  missed: number;
  completed: number;
  attendanceRate: number;
  completionRate: number;
  totalMinutes: number;
  withPartner: number;
  solo: number;
  asOwner: number;
  currentStreak: number;
  longestStreak: number;
  typeBreakdown: Record<string, number>;
  byWeekday: number[];
  trend: TrendDay[];
  recent: RecentSession[];
};

function formatTotalMinutes(total: number): string {
  if (total < 60) return `${total} min`;
  const hours = Math.floor(total / 60);
  const mins = total % 60;
  if (mins === 0) return `${hours} hr`;
  return `${hours}h ${mins}m`;
}

function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return `${Math.round(value * 100)}%`;
}

function formatRecentTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const startOfDay = (d: Date) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const diffDays = Math.round(
    (startOfDay(now).getTime() - startOfDay(date).getTime()) /
      (1000 * 60 * 60 * 24),
  );
  const time = date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  if (diffDays === 0) return `Today · ${time}`;
  if (diffDays === 1) return `Yesterday · ${time}`;
  if (diffDays < 7) return `${diffDays}d ago · ${time}`;
  return (
    date.toLocaleDateString("en-IN", {
      month: "short",
      day: "numeric",
      timeZone: "Asia/Kolkata",
    }) + ` · ${time}`
  );
}

export function ProfileStats() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/users/me/stats");
        if (!res.ok) throw new Error("Could not load stats");
        const data = await res.json();
        if (!cancelled) setStats(data.stats as Stats);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Bucket the 56-day trend into 8 weeks for a clean grid.
  const weeks = useMemo(() => {
    if (!stats) return [] as TrendDay[][];
    const out: TrendDay[][] = [];
    for (let i = 0; i < stats.trend.length; i += 7) {
      out.push(stats.trend.slice(i, i + 7));
    }
    return out;
  }, [stats]);

  // Highest single-day sessions value, used to scale heatmap opacity.
  const maxPerDay = useMemo(() => {
    if (!stats) return 0;
    return stats.trend.reduce((m, d) => (d.sessions > m ? d.sessions : m), 0);
  }, [stats]);

  if (loading) {
    return (
      <section className={designStyles.card}>
        <div className={designStyles.cardHead}>
          <div>
            <h2 className={designStyles.cardTitle}>Session stats</h2>
            <p className={designStyles.cardSub}>
              Your attendance, completion, and focused-time history.
            </p>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div className={designStyles.shimmer} style={{ height: 88 }} />
          <div className={designStyles.shimmer} style={{ height: 140 }} />
          <div className={designStyles.shimmer} style={{ height: 80 }} />
        </div>
      </section>
    );
  }

  if (error || !stats) {
    return (
      <section className={designStyles.card}>
        <div className={designStyles.cardHead}>
          <div>
            <h2 className={designStyles.cardTitle}>Session stats</h2>
            <p className={designStyles.cardSub}>
              {error ?? "Stats are unavailable right now."}
            </p>
          </div>
        </div>
      </section>
    );
  }

  if (stats.booked === 0) {
    return (
      <section className={designStyles.card}>
        <div className={designStyles.cardHead}>
          <div>
            <h2 className={designStyles.cardTitle}>Session stats</h2>
            <p className={designStyles.cardSub}>
              Complete your first session to start tracking your focus history.
            </p>
          </div>
        </div>
        <Link
          href="/dashboard"
          style={{
            display: "inline-flex",
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
    <section className={designStyles.card}>
      <div className={designStyles.cardHead}>
        <div>
          <h2 className={designStyles.cardTitle}>Session stats</h2>
          <p className={designStyles.cardSub}>
            How often you show up and follow through.
          </p>
        </div>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontSize: 12,
            color: "var(--ink-mute)",
          }}
        >
          <span>{stats.booked} sessions tracked</span>
        </div>
      </div>

      {/* Headline metrics */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <StatTile
          label="Completed"
          value={stats.completed.toString()}
          hint={`of ${stats.attended} attended`}
        />
        <StatTile
          label="Focused time"
          value={formatTotalMinutes(stats.totalMinutes)}
          hint={
            stats.completed > 0
              ? `${Math.round(stats.totalMinutes / stats.completed)} min avg`
              : undefined
          }
        />
        <StatTile
          label="Attendance"
          value={formatPercent(stats.attendanceRate)}
          hint={`${stats.attended}/${stats.booked} booked`}
          tone={
            stats.attendanceRate >= 0.85
              ? "good"
              : stats.attendanceRate >= 0.6
                ? "neutral"
                : "warn"
          }
        />
        <StatTile
          label="Completion"
          value={formatPercent(stats.completionRate)}
          hint={
            stats.attended > 0
              ? `${stats.completed}/${stats.attended} finished`
              : "Join your first session"
          }
          tone={
            stats.attended === 0
              ? "neutral"
              : stats.completionRate >= 0.85
                ? "good"
                : stats.completionRate >= 0.6
                  ? "neutral"
                  : "warn"
          }
        />
      </div>

      {/* Missed callout */}
      {stats.missed > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "12px 14px",
            borderRadius: 12,
            background: "var(--danger-soft)",
            border: "1px solid color-mix(in oklab, var(--danger) 18%, var(--line))",
            marginBottom: 24,
          }}
        >
          <span
            aria-hidden
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 32,
              height: 32,
              borderRadius: 8,
              background: "color-mix(in oklab, var(--danger) 22%, transparent)",
              color: "var(--danger)",
              fontWeight: 600,
              fontSize: 14,
            }}
          >
            {stats.missed}
          </span>
          <div style={{ flex: 1 }}>
            <p style={{ margin: 0, fontSize: 14, color: "var(--ink)" }}>
              {stats.missed === 1
                ? "1 booked session you didn’t join"
                : `${stats.missed} booked sessions you didn’t join`}
            </p>
            <p style={{ margin: "2px 0 0", fontSize: 12, color: "var(--ink-mute)" }}>
              Showing up keeps your partners’ time intact and your streak alive.
            </p>
          </div>
        </div>
      )}

      {/* Activity heatmap (8 weeks × 7 days) */}
      <div style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--ink-soft)",
              letterSpacing: 0.005,
              textTransform: "uppercase",
            }}
          >
            Last 8 weeks
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: "var(--ink-mute)" }}>
            <span>Less</span>
            {[0, 0.25, 0.5, 0.75, 1].map((scale) => (
              <span
                key={scale}
                aria-hidden
                style={{
                  width: 12,
                  height: 12,
                  borderRadius: 3,
                  background: heatColor(scale),
                  border: "1px solid var(--line-soft)",
                }}
              />
            ))}
            <span>More</span>
          </div>
        </div>
        <div
          role="img"
          aria-label={`Activity over the past 8 weeks. ${stats.completed} completed sessions.`}
          style={{
            display: "grid",
            gridTemplateColumns: `repeat(${weeks.length}, 1fr)`,
            gap: 4,
          }}
        >
          {weeks.map((week, wIdx) => (
            <div
              key={wIdx}
              style={{ display: "grid", gridTemplateRows: "repeat(7, 1fr)", gap: 4 }}
            >
              {week.map((day) => {
                const scale =
                  maxPerDay > 0 && day.sessions > 0
                    ? Math.max(0.25, day.sessions / maxPerDay)
                    : 0;
                return (
                  <div
                    key={day.date}
                    title={`${day.date}: ${day.sessions} session${day.sessions === 1 ? "" : "s"}, ${formatTotalMinutes(day.minutes)}`}
                    style={{
                      aspectRatio: "1 / 1",
                      borderRadius: 3,
                      background: heatColor(scale),
                      border: "1px solid var(--line-soft)",
                    }}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Streak + breakdown row */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: 12,
          marginBottom: 24,
        }}
      >
        <FactCard
          label="Current streak"
          value={`${stats.currentStreak} day${stats.currentStreak === 1 ? "" : "s"}`}
          hint={
            stats.longestStreak > stats.currentStreak
              ? `Best: ${stats.longestStreak} days`
              : "That’s your record"
          }
        />
        <FactCard
          label="With a partner"
          value={`${stats.withPartner}`}
          hint={stats.solo > 0 ? `${stats.solo} solo` : "No solo sessions"}
        />
        <FactCard
          label="You hosted"
          value={`${stats.asOwner}`}
          hint={
            stats.booked - stats.asOwner > 0
              ? `${stats.booked - stats.asOwner} joined`
              : "All hosted by you"
          }
        />
      </div>

      {/* Session type breakdown */}
      {Object.keys(stats.typeBreakdown).length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <h3
            style={{
              margin: "0 0 10px",
              fontSize: 13,
              fontWeight: 500,
              color: "var(--ink-soft)",
              letterSpacing: 0.005,
              textTransform: "uppercase",
            }}
          >
            By session type
          </h3>
          <TypeBars typeBreakdown={stats.typeBreakdown} />
        </div>
      )}

      {/* Recent activity */}
      <div>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 10,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: 13,
              fontWeight: 500,
              color: "var(--ink-soft)",
              letterSpacing: 0.005,
              textTransform: "uppercase",
            }}
          >
            Recent activity
          </h3>
          <Link
            href="/sessions"
            style={{
              fontSize: 12,
              color: "var(--ink-mute)",
              textDecoration: "none",
            }}
          >
            See all →
          </Link>
        </div>
        <ul
          style={{
            margin: 0,
            padding: 0,
            listStyle: "none",
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          {stats.recent.map((r) => (
            <li
              key={r.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "10px 12px",
                borderRadius: 10,
                border: "1px solid var(--line-soft)",
                background: "var(--card)",
              }}
            >
              <RecentDot
                tone={
                  !r.attended
                    ? "missed"
                    : r.completed
                      ? "completed"
                      : "partial"
                }
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <p
                  style={{
                    margin: 0,
                    fontSize: 14,
                    color: "var(--ink)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {r.name || `${r.sessionType} · ${r.durationMin} min`}
                </p>
                <p
                  style={{
                    margin: "2px 0 0",
                    fontSize: 12,
                    color: "var(--ink-mute)",
                  }}
                >
                  {formatRecentTime(r.start)} · {r.solo ? "Solo" : "With partner"}
                </p>
              </div>
              <RecentBadge
                tone={
                  !r.attended
                    ? "missed"
                    : r.completed
                      ? "completed"
                      : "partial"
                }
              />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function StatTile({
  label,
  value,
  hint,
  tone = "neutral",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "good" | "neutral" | "warn";
}) {
  const accent =
    tone === "good"
      ? "var(--success)"
      : tone === "warn"
        ? "var(--danger)"
        : "var(--ink-soft)";
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 12,
        border: "1px solid var(--line)",
        background: "var(--card)",
        display: "flex",
        flexDirection: "column",
        gap: 4,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: "var(--ink-mute)",
          letterSpacing: 0.04,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        className={designStyles.mono}
        style={{
          fontSize: 26,
          fontWeight: 500,
          color: "var(--ink)",
          letterSpacing: "-0.02em",
          lineHeight: 1.1,
        }}
      >
        {value}
      </span>
      {hint && (
        <span style={{ fontSize: 12, color: accent }}>{hint}</span>
      )}
    </div>
  );
}

function FactCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        border: "1px solid var(--line-soft)",
        background: "color-mix(in oklab, var(--card) 60%, var(--bg))",
        display: "flex",
        flexDirection: "column",
        gap: 2,
      }}
    >
      <span
        style={{
          fontSize: 11,
          color: "var(--ink-mute)",
          letterSpacing: 0.04,
          textTransform: "uppercase",
        }}
      >
        {label}
      </span>
      <span
        style={{
          fontSize: 18,
          fontWeight: 500,
          color: "var(--ink)",
          letterSpacing: "-0.01em",
        }}
      >
        {value}
      </span>
      {hint && (
        <span style={{ fontSize: 12, color: "var(--ink-mute)" }}>{hint}</span>
      )}
    </div>
  );
}

function TypeBars({
  typeBreakdown,
}: {
  typeBreakdown: Record<string, number>;
}) {
  const entries = Object.entries(typeBreakdown).sort((a, b) => b[1] - a[1]);
  const total = entries.reduce((sum, [, v]) => sum + v, 0);
  if (total === 0) return null;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      {entries.map(([type, count]) => {
        const pct = count / total;
        return (
          <div key={type} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                fontSize: 13,
              }}
            >
              <span style={{ color: "var(--ink)", textTransform: "capitalize" }}>
                {type.replace("-", " ")}
              </span>
              <span style={{ color: "var(--ink-mute)" }}>
                {count} · {Math.round(pct * 100)}%
              </span>
            </div>
            <div
              style={{
                height: 6,
                borderRadius: 3,
                background: "var(--line-soft)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${pct * 100}%`,
                  height: "100%",
                  background:
                    "linear-gradient(90deg, var(--accent) 0%, color-mix(in oklab, var(--accent) 70%, var(--ink)) 100%)",
                  borderRadius: 3,
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function RecentDot({
  tone,
}: {
  tone: "completed" | "partial" | "missed";
}) {
  const color =
    tone === "completed"
      ? "var(--success)"
      : tone === "missed"
        ? "var(--danger)"
        : "var(--ink-mute)";
  return (
    <span
      aria-hidden
      style={{
        display: "inline-flex",
        width: 8,
        height: 8,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}

function RecentBadge({
  tone,
}: {
  tone: "completed" | "partial" | "missed";
}) {
  const map = {
    completed: { label: "Completed", bg: "var(--success-soft)", fg: "var(--success)" },
    partial: { label: "Left early", bg: "var(--line-soft)", fg: "var(--ink-soft)" },
    missed: { label: "Missed", bg: "var(--danger-soft)", fg: "var(--danger)" },
  } as const;
  const t = map[tone];
  return (
    <span
      style={{
        padding: "3px 8px",
        borderRadius: 999,
        fontSize: 11,
        fontWeight: 500,
        background: t.bg,
        color: t.fg,
        flexShrink: 0,
      }}
    >
      {t.label}
    </span>
  );
}

function heatColor(scale: number): string {
  // 0 = empty cell, 1 = strongest. Uses the same plum/sky accent as the
  // rest of the surface so the heatmap fits visually with the design system.
  if (scale <= 0) return "color-mix(in oklab, var(--card) 60%, var(--bg))";
  // Step the scale into 4 buckets for cleaner visual differentiation.
  const buckets = [0.25, 0.5, 0.75, 1];
  const stepped =
    buckets.find((b) => scale <= b + 0.0001) ?? 1;
  const mix = Math.round(stepped * 70) + 15; // 15%..85%
  return `color-mix(in oklab, var(--accent) ${mix}%, var(--card))`;
}
