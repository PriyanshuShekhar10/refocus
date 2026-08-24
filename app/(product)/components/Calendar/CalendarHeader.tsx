"use client";

import { formatLocalDate } from "@/lib/localTime";
import { addDaysInTimeZone } from "@/lib/zonedTime";
import { useUserTimezone } from "@/components/user-timezone-provider";
import { cn } from "@/lib/utils";

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
}: CalendarHeaderProps) {
  const { timeZone } = useUserTimezone();
  const rangeLabel = formatVisibleRange(startDate, visibleDays, timeZone);

  return (
    <div className="flex h-14 items-center justify-between gap-6 border-b border-gray-200 px-4 dark:border-gray-700">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => onShiftRange(-1)}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-md",
              "text-gray-500 transition-colors",
              "hover:bg-gray-100 hover:text-gray-800",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CA5995]/40",
              "dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
            )}
            title="Previous"
            aria-label="Previous range"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </button>

          <button
            type="button"
            onClick={onGoToday}
            className={cn(
              "inline-flex h-9 items-center rounded-md border border-gray-200 px-3",
              "text-sm font-medium text-gray-800 transition-colors",
              "hover:bg-gray-100",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CA5995]/40",
              "dark:border-gray-600 dark:text-gray-100 dark:hover:bg-gray-800",
            )}
          >
            Today
          </button>

          <button
            type="button"
            onClick={() => onShiftRange(1)}
            className={cn(
              "inline-flex h-9 w-9 items-center justify-center rounded-md",
              "text-gray-500 transition-colors",
              "hover:bg-gray-100 hover:text-gray-800",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CA5995]/40",
              "dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-100",
            )}
            title="Next"
            aria-label="Next range"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
              <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        <h2
          className="truncate text-base font-semibold tracking-tight text-gray-900 dark:text-gray-100"
          title={`Times shown in ${timeZone.replace(/_/g, " ")}`}
        >
          {rangeLabel}
        </h2>
      </div>

      <div
        className="flex shrink-0 items-center rounded-md bg-gray-100/80 p-0.5 dark:bg-gray-800/80"
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
                "h-8 rounded px-2.5 text-sm font-medium transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#CA5995]/40",
                selected
                  ? "bg-white text-gray-900 shadow-sm dark:bg-gray-700 dark:text-white"
                  : "text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200",
              )}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
