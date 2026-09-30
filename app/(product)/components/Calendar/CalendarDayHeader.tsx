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
      className="flex h-9 shrink-0 border-b border-rf-line-soft/70"
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
              <div className="relative flex items-baseline gap-1 pb-0.5">
                <span
                  className={cn(
                    "text-[13px] font-normal",
                    isToday
                      ? "text-rf-ink-mute"
                      : "text-rf-ink-mute",
                  )}
                >
                  {weekday}
                </span>
                <span
                  className={cn(
                    "text-[14px] tabular-nums",
                    isToday
                      ? "font-semibold text-rf-plum-ink"
                      : "font-medium text-rf-ink",
                  )}
                >
                  {dateNum}
                </span>
                {isToday ? (
                  <span
                    className="absolute -bottom-1 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full bg-rf-rose/65"
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
