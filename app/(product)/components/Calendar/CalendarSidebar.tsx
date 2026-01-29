import BookSessionButton from "../BookSessionButton";

interface CalendarSidebarProps {
  durationFilter: number[];
  onDurationFilterChange: (duration: number) => void;
  createDuration: number;
  onCreateDurationChange: (duration: number) => void;
}

export function CalendarSidebar({
  durationFilter,
  onDurationFilterChange,
  createDuration,
  onCreateDurationChange,
}: CalendarSidebarProps) {
  return (
    <aside className="w-72 shrink-0 rounded-xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-700 dark:bg-gray-900">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
        Book a Session
      </h3>
      <div className="mt-6">
        <BookSessionButton />

        <p className="text-xs text-gray-500 dark:text-gray-400">
          Duration (minutes)
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[25, 50, 75].map((m) => (
            <button
              key={m}
              onClick={() => onDurationFilterChange(m)}
              className={`rounded-md border px-3 py-2 text-sm ${
                durationFilter.includes(m)
                  ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
      </div>
      {/* TODO: Add more filters for session type, partner, etc. here */}
      <div className="mt-4">
        <p className="text-xs text-gray-500 dark:text-gray-400">
          New session length
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[25, 50, 75].map((m) => (
            <button
              key={`create-${m}`}
              onClick={() => onCreateDurationChange(m as 25 | 50 | 75)}
              className={`rounded-md border px-3 py-2 text-sm ${
                createDuration === m
                  ? "border-green-600 bg-green-50 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                  : "border-gray-200 dark:border-gray-700"
              }`}
            >
              {m}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          Tip: click an empty slot to create your own session.
        </p>
      </div>
    </aside>
  );
}
