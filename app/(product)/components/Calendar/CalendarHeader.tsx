import { formatDayLabel } from "@/lib/utils";

interface CalendarHeaderProps {
  startDate: Date;
  locale?: string;
  onShiftRange: (delta: number) => void;
  onGoToday: () => void;
}

export function CalendarHeader({
  startDate,
  locale = "en-IN",
  onShiftRange,
  onGoToday,
}: CalendarHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b px-4 py-3 dark:border-gray-700">
      <div className="flex items-center gap-2">
        <button
          onClick={() => onShiftRange(-1)}
          className="rounded-md border p-2 dark:border-gray-600"
        >
          ◀︎
        </button>
        <button
          onClick={onGoToday}
          className="rounded-md border px-3 py-1.5 text-sm dark:border-gray-600"
        >
          Today
        </button>
        <button
          onClick={() => onShiftRange(1)}
          className="rounded-md border p-2 dark:border-gray-600"
        >
          ▶︎
        </button>
        <span className="ml-4 text-lg font-semibold dark:text-gray-100">
          {formatDayLabel(startDate, locale)}
        </span>
      </div>
      {/* TODO: Add layout toggle (List/Grid) and search bar here */}
    </div>
  );
}
