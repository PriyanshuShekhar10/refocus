import { formatDayLabel } from "@/lib/utils";

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

export function CalendarHeader({
  startDate,
  locale = "en-IN",
  onShiftRange,
  onGoToday,
  visibleDays,
  onVisibleDaysChange,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onShiftRange(-1)}
          className="rounded-md border p-2 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800 transition-colors"
          title="Previous"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M12.707 5.293a1 1 0 010 1.414L9.414 10l3.293 3.293a1 1 0 01-1.414 1.414l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <button
          onClick={onGoToday}
          className="rounded-md border px-3 py-1.5 text-sm font-medium hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800 transition-colors"
        >
          Today
        </button>
        <button
          onClick={() => onShiftRange(1)}
          className="rounded-md border p-2 hover:bg-gray-100 dark:border-gray-600 dark:hover:bg-gray-800 transition-colors"
          title="Next"
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
          </svg>
        </button>
        <span className="ml-4 text-lg font-semibold dark:text-gray-100">
          {formatDayLabel(startDate, locale)}
        </span>
      </div>

      {/* View selector */}
      <div className="flex items-center gap-1 rounded-lg border border-gray-200 dark:border-gray-600 p-1 bg-gray-50 dark:bg-gray-800">
        {VIEW_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => onVisibleDaysChange(option.value)}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all ${
              visibleDays === option.value
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
