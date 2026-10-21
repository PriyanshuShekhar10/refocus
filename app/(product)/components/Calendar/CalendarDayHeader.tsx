"use client";

import { formatLocalDate } from "@/lib/localTime";
import { ymdInTimeZone } from "@/lib/zonedTime";
import { cn } from "@/lib/utils";

type ViewDays = 3 | 5 | 7;

interface CalendarDayHeaderProps {
  days: Date[];
  visibleDays: ViewDays;
  timeZone: string;
  /** Matches classic scrollbar width so labels align with day columns. */
  endInset?: number;
}

export function CalendarDayHeader({
  days,
  visibleDays,
  timeZone,
  endInset = 0,
}: CalendarDayHeaderProps) {
  const todayKey = ymdInTimeZone(new Date(), timeZone);

  return (
    <div
      className="flex h-12 shrink-0 border-b border-rf-line-soft/70"
      style={endInset > 0 ? { paddingRight: endInset } : undefined}
    >
      {/* Aligns with time gutter — intentionally blank */}
      <div
        className="w-16 shrink-0 border-r border-rf-line-soft/60"
        aria-hidden="true"
      />
      <div
        className="grid min-w-0 flex-1"
        style={{ gridTemplateColumns: `repeat(${visibleDays}, 1fr)` }}
      >
        {days.map((day) => {
          const key = ymdInTimeZone(day, timeZone);
          const isToday = key === todayKey;
          const weekday = formatLocalDate(day, { weekday: "short" });
          const dateNum = formatLocalDate(day, { day: "numeric" });

          return (
            <div
              key={key}
              className="flex items-center justify-center border-r border-rf-line-soft/60"
            >
              <div className="flex items-center gap-2">
                <span className="text-[12.5px] font-bold uppercase tracking-[0.06em] text-rf-ink-mute">
                  {weekday}
                </span>
                <span
                  aria-current={isToday ? "date" : undefined}
                  className={cn(
                    "grid h-[30px] min-w-[30px] place-items-center rounded-[10px] px-1.5 text-[15px] font-extrabold tabular-nums",
                    isToday ? "bg-rf-today text-white" : "text-rf-ink",
                  )}
                >
                  {dateNum}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
