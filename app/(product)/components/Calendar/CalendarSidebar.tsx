import BookSessionButton from "../BookSessionButton";
import { DurationSelector } from "./DurationSelector";
import { type DurationMin } from "@/constants/calendar";

interface CalendarSidebarProps {
  /** Currently selected durations for filtering */
  durationFilter: DurationMin[];
  /** Callback when filter selection changes */
  onDurationFilterChange: (duration: DurationMin) => void;
  /** Currently selected duration for creating new sessions */
  createDuration: DurationMin;
  /** Callback when create duration changes */
  onCreateDurationChange: (duration: DurationMin) => void;
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

        <DurationSelector
          mode="multi"
          selected={durationFilter}
          onChange={onDurationFilterChange}
          variant="primary"
          label="Duration (minutes)"
        />
      </div>
      {/* TODO: Add more filters for session type, partner, etc. here */}
      <div className="mt-4">
        <DurationSelector
          mode="single"
          selected={createDuration}
          onChange={onCreateDurationChange}
          variant="success"
          label="New session length"
        />
        <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
          Tip: click an empty slot to create your own session.
        </p>
      </div>
    </aside>
  );
}
