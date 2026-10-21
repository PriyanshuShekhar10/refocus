"use client";

import { formatLocalDate } from "@/lib/localTime";
import { addDaysInTimeZone } from "@/lib/zonedTime";
import { useUserTimezone } from "@/components/user-timezone-provider";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Flame, ListFilter, Plus } from "lucide-react";
import { useSessionStats } from "@/hooks/useSessionStats";
import { cn } from "@/lib/utils";
import { DURATION_OPTIONS, type DurationMin } from "@/constants/calendar";
import BookSessionButton from "../BookSessionButton";

type ViewDays = 3 | 5 | 7;

const VIEW_OPTIONS: { value: ViewDays; label: string }[] = [
  { value: 3, label: "3 Days" },
  { value: 5, label: "5 Days" },
  { value: 7, label: "Week" },
];

interface CalendarHeaderProps {
  startDate: Date;
  locale?: string;
  onShiftRange: (delta: number) => void;
  onGoToday: () => void;
  visibleDays: ViewDays;
  onVisibleDaysChange: (days: ViewDays) => void;
  durationFilter?: DurationMin[];
  onToggleDuration?: (duration: DurationMin) => void;
}

function formatVisibleRange(
  startDate: Date,
  visibleDays: ViewDays,
  timeZone: string,
): string {
  const endDate = addDaysInTimeZone(startDate, visibleDays - 1, timeZone);
  const startMonth = formatLocalDate(startDate, { month: "short" });
  const endMonth = formatLocalDate(endDate, { month: "short" });
  const startDay = formatLocalDate(startDate, { day: "numeric" });
  const endDay = formatLocalDate(endDate, { day: "numeric" });

  if (startMonth === endMonth) {
    return `${startMonth} ${startDay}–${endDay}`;
  }

  return `${startMonth} ${startDay} – ${endMonth} ${endDay}`;
}

export function CalendarHeader({
  startDate,
  onShiftRange,
  onGoToday,
  visibleDays,
  onVisibleDaysChange,
  durationFilter = [...DURATION_OPTIONS],
  onToggleDuration,
}: CalendarHeaderProps) {
  const { timeZone } = useUserTimezone();
  const rangeLabel = formatVisibleRange(startDate, visibleDays, timeZone);
  const [filterOpen, setFilterOpen] = useState(false);
  const filterRef = useRef<HTMLDivElement>(null);
  const hiddenCount = DURATION_OPTIONS.length - durationFilter.length;

  useEffect(() => {
    if (!filterOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!filterRef.current?.contains(e.target as Node)) setFilterOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFilterOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [filterOpen]);

  // Prototype "chunky" buttons: 2px edge, 4px bottom edge that presses down.
  const chunky =
    "border-2 border-b-4 border-rf-chunk bg-rf-card text-rf-ink-soft transition-[transform,border-width,background-color] duration-100 hover:bg-rf-chunk-hover active:translate-y-[2px] active:border-b-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-primary/40";
  const navBtn = cn("grid h-9 w-9 place-items-center rounded-xl", chunky);
  const { stats } = useSessionStats();
  const streak = stats?.currentStreak ?? 0;

  return (
    <div className="flex h-16 shrink-0 items-center justify-between gap-4 border-b-2 border-rf-divider pl-[18px] pr-4">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            type="button"
            onClick={() => onShiftRange(-1)}
            className={navBtn}
            title="Previous"
            aria-label="Previous range"
          >
            <ChevronLeft size={16} strokeWidth={2.4} />
          </button>
          <button
            type="button"
            onClick={onGoToday}
            className={cn("h-9 whitespace-nowrap rounded-xl px-3.5 text-[13px] font-bold", chunky)}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => onShiftRange(1)}
            className={navBtn}
            title="Next"
            aria-label="Next range"
          >
            <ChevronRight size={16} strokeWidth={2.4} />
          </button>
        </div>

        <h2
          className="truncate text-[21px] font-extrabold tracking-[-0.02em] text-rf-ink"
          title={`Times shown in ${timeZone.replace(/_/g, " ")}`}
        >
          {rangeLabel}
        </h2>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        {streak > 0 ? (
          <div
            title="Focus streak"
            className="flex h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl bg-rf-streak-bg px-3 text-[15px] font-extrabold text-rf-streak-ink"
          >
            <Flame className="h-[19px] w-[19px] text-rf-streak" fill="currentColor" strokeWidth={0} aria-hidden />
            <span>{streak}-day streak</span>
          </div>
        ) : null}
        {onToggleDuration ? (
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              aria-expanded={filterOpen}
              className={cn(
                "flex h-[38px] items-center gap-1.5 whitespace-nowrap rounded-xl px-3 text-[13px] font-bold",
                chunky,
                filterOpen && "border-rf-primary",
              )}
            >
              <ListFilter size={14} />
              <span className="hidden min-[1400px]:inline">Filter</span>
              {hiddenCount > 0 ? (
                <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-rf-primary px-[5px] text-[10.5px] font-semibold text-rf-on-primary">
                  {hiddenCount}
                </span>
              ) : null}
            </button>
            {filterOpen ? (
              <div className="absolute right-0 top-[calc(100%+8px)] z-30 flex w-[260px] flex-col gap-3 rounded-2xl border-2 border-b-[5px] border-rf-chunk bg-rf-card p-3 shadow-[0_12px_30px_-12px_rgba(0,0,0,.25)]">
                <div className="flex flex-col gap-1.5">
                  <span className="px-1.5 text-[11.5px] font-semibold tracking-[0.02em] text-rf-ink-mute">
                    Duration (minutes)
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {DURATION_OPTIONS.map((d) => {
                      const on = durationFilter.includes(d);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() => onToggleDuration(d)}
                          aria-pressed={on}
                          className={cn(
                            "h-[30px] whitespace-nowrap rounded-lg border font-rf-mono text-xs transition-colors",
                            on
                              ? "border-rf-rose bg-rf-cream-bg text-rf-plum-ink"
                              : "border-rf-line bg-transparent text-rf-ink-mute",
                          )}
                        >
                          {d}m
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <span className="px-1.5 text-[11.5px] font-semibold tracking-[0.02em] text-rf-ink-mute">
                    View
                  </span>
                  <div
                    className="grid grid-cols-3 gap-0.5 rounded-[10px] bg-rf-line-soft p-[3px]"
                    role="group"
                    aria-label="Calendar view"
                  >
                    {VIEW_OPTIONS.map((option) => {
                      const selected = visibleDays === option.value;
                      return (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => onVisibleDaysChange(option.value)}
                          aria-pressed={selected}
                          className={cn(
                            "h-7 whitespace-nowrap rounded-[7px] px-2 text-[12.5px] font-medium transition-colors",
                            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-rose",
                            selected
                              ? "bg-rf-card text-rf-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                              : "text-rf-ink-mute hover:text-rf-ink-soft",
                          )}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : null}
          </div>
        ) : null}

        <BookSessionButton
          label={
            <span className="flex items-center gap-1.5">
              <Plus size={15} strokeWidth={2.4} />
              <span>Book session</span>
            </span>
          }
          ariaLabel="Book session"
          className="!h-10 !w-auto shrink-0 whitespace-nowrap !rounded-xl !px-4 !py-0 text-sm !font-extrabold shadow-[0_4px_0_var(--rf-primary-shadow)] transition-transform active:translate-y-1 active:shadow-none"
        />
      </div>
    </div>
  );
}
