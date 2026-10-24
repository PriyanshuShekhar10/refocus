"use client";

import { useEffect, useState } from "react";
import { Flame } from "lucide-react";
import type { TrendDay } from "@/hooks/useSessionStats";

const LABELS = ["M", "T", "W", "T", "F", "S", "S"];

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Mon–Sun of the current week: which days had at least one completed session. */
export function weekFocusDays(trend: TrendDay[], now = new Date()): { label: string; focused: boolean; today: boolean; future: boolean }[] {
  const byDate = new Map(trend.map((t) => [t.date.slice(0, 10), t.sessions]));
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
  const todayKey = dayKey(now);
  return LABELS.map((label, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const key = dayKey(d);
    return { label, focused: (byDate.get(key) ?? 0) > 0, today: key === todayKey, future: key > todayKey };
  });
}

/** The "this week" streak row from the prototype: flame circles for focused days. */
export function WeekStreak({
  trend,
  streak,
  best,
  bordered = true,
}: {
  trend: TrendDay[];
  streak: number;
  best: number;
  /** Set false when this is the only content in its own card (no divider above it needed). */
  bordered?: boolean;
}) {
  // "Today" depends on the viewer's local clock; computing it during SSR (server
  // timezone/instant) can disagree with the client's first render and trigger a
  // hydration mismatch. Resolve it only after mount, like the server would see it.
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const days = weekFocusDays(trend, now ?? new Date(0));
  return (
    <div className={bordered ? "border-t border-rf-line-soft pt-2.5" : ""}>
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-1 text-xs font-bold text-rf-streak-ink">
          <Flame className="h-3.5 w-3.5 text-rf-streak" fill="currentColor" strokeWidth={0} aria-hidden />
          {streak}-day streak
        </span>
        <span className="text-[11.5px] text-rf-ink-mute">Best {Math.max(best, streak)}</span>
      </div>
      <div className="grid grid-cols-7 gap-1" role="list" aria-label="This week">
        {days.map((d, i) => {
          const title = d.focused ? "Focused" : d.today ? "Finish a session to keep your streak" : "";
          return (
            <div key={i} role="listitem" title={title} className="flex flex-col items-center gap-[3px]">
              <span
                className={
                  d.focused
                    ? `grid h-7 w-7 place-items-center rounded-full border-2 bg-rf-streak text-white ${d.today ? "border-rf-streak-ink" : "border-rf-streak"}`
                    : d.today
                      ? "grid h-7 w-7 place-items-center rounded-full border-2 border-rf-streak bg-rf-streak-bg text-rf-streak"
                      : "grid h-7 w-7 place-items-center rounded-full border-2 border-rf-line-soft bg-rf-chunk-hover"
                }
              >
                {d.focused || d.today ? <Flame className="h-3 w-3" fill="currentColor" strokeWidth={0} aria-hidden /> : null}
              </span>
              <span
                className={`text-[10px] font-semibold ${
                  d.today ? "text-rf-streak-ink" : d.focused ? "text-rf-ink-mute" : "text-rf-ink-mute/60"
                }`}
              >
                {d.label}
                <span className="sr-only">{d.focused ? " focused" : d.today ? " today" : ""}</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
