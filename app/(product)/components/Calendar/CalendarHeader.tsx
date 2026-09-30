"use client";

import { formatLocalDate } from "@/lib/localTime";
import { addDaysInTimeZone } from "@/lib/zonedTime";
import { useUserTimezone } from "@/components/user-timezone-provider";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ListFilter, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { DURATION_OPTIONS, type DurationMin } from "@/constants/calendar";
import BookSessionButton from "../BookSessionButton";

type ViewDays = 3 | 5 | 7;

const VIEW_OPTIONS: { value: ViewDays; label: string; short: string }[] = [
  { value: 3, label: "3 Days", short: "3D" },
  { value: 5, label: "5 Days", short: "5D" },
  { value: 7, label: "Week", short: "W" },
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

  const navBtn =
    "grid h-8 w-8 place-items-center rounded-lg text-rf-ink-soft transition-colors hover:bg-rf-line-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-rose";

  return (
    <div className="flex h-14 shrink-0 items-center justify-between gap-4 border-b border-rf-line pl-4 pr-3">
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onShiftRange(-1)}
            className={navBtn}
            title="Previous"
            aria-label="Previous range"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            onClick={onGoToday}
            className="h-7 whitespace-nowrap rounded-lg border border-rf-line px-2.5 text-[13px] font-medium text-rf-ink-soft transition-colors hover:bg-rf-line-soft hover:text-rf-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-rose"
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
            <ChevronRight size={16} />
          </button>
        </div>

        <h2
          className="truncate text-lg font-semibold tracking-[-0.02em] text-rf-ink"
          title={`Times shown in ${timeZone.replace(/_/g, " ")}`}
        >
          {rangeLabel}
        </h2>
      </div>

      <div className="flex shrink-0 items-center gap-2.5">
        {onToggleDuration ? (
          <div className="relative" ref={filterRef}>
            <button
              type="button"
              onClick={() => setFilterOpen((v) => !v)}
              aria-expanded={filterOpen}
              className={cn(
                "flex h-[34px] items-center gap-1.5 whitespace-nowrap rounded-[9px] border border-rf-line px-3 text-[13px] font-medium text-rf-ink-soft transition-colors hover:text-rf-ink",
                filterOpen ? "bg-rf-line-soft" : "bg-transparent",
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
              <div className="absolute right-0 top-[calc(100%+6px)] z-30 flex w-[248px] flex-col gap-3 rounded-xl border border-rf-line bg-rf-card p-3 shadow-[0_12px_32px_rgba(0,0,0,.14)]">
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
              </div>
            ) : null}
          </div>
        ) : null}

        <div
          className="flex gap-0.5 rounded-[10px] bg-rf-line-soft p-[3px]"
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
                  "h-7 whitespace-nowrap rounded-[7px] px-2.5 text-[13px] font-medium transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rf-rose",
                  selected
                    ? "bg-rf-card text-rf-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                    : "text-rf-ink-mute hover:text-rf-ink-soft",
                )}
              >
                <span className="hidden min-[1400px]:inline">{option.label}</span>
                <span className="min-[1400px]:hidden">{option.short}</span>
              </button>
            );
          })}
        </div>

        <BookSessionButton
          label={
            <span className="flex items-center gap-1.5">
              <Plus size={15} strokeWidth={2.4} />
              <span className="hidden min-[1400px]:inline">Book session</span>
            </span>
          }
          ariaLabel="Book session"
          className="!h-9 !w-auto whitespace-nowrap !rounded-[10px] !px-3.5 !py-0 text-[13.5px] !font-semibold"
        />
      </div>
    </div>
  );
}
