import type { CalendarEvent } from "@/types/calendar";
import { formatLocalDate, formatLocalTimeRange } from "@/lib/localTime";
import { ModalWrapper } from "./ModalWrapper";

export function BookingModal({
  event,
  onClose,
  quiet,
  onChangeQuiet,
  onConfirm,
}: {
  event: CalendarEvent;
  onClose: () => void;
  quiet: boolean;
  onChangeQuiet: (v: boolean) => void;
  onConfirm: () => void;
}) {
  const handleConfirm = async () => {
    try {
      await onConfirm();
      onClose();
    } catch {
      // Error shown by parent toast
    }
  };

  const startDate = new Date(event.start);
  const endDate = new Date(event.end);
  const dateLabel = formatLocalDate(startDate, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const timeRange = formatLocalTimeRange(startDate, endDate, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <ModalWrapper onClose={onClose}>
      <div className="w-full max-w-md rounded-lg bg-rf-card p-6 shadow-2xl border border-rf-line">
        <h2 className="text-xl font-bold text-rf-ink">
          Confirm Booking
        </h2>
        <p className="mt-2 text-rf-ink-soft">
          You are booking a{" "}
          <strong className="text-rf-plum-ink">
            {event.durationMin}-minute {event.sessionType}
          </strong>{" "}
          session for:
        </p>
        <div className="mt-4 rounded-md bg-rf-line-soft p-3 text-center font-medium text-rf-ink">
          <p>{dateLabel}</p>
          <p className="mt-1 text-rf-plum-ink">{timeRange}</p>
        </div>

        {/* TODO: Add other booking options like partner selection, goal text box */}
        <div className="mt-4 flex items-center gap-3">
          <input
            id="quiet-toggle"
            type="checkbox"
            className="h-4 w-4 accent-gray-700"
            checked={quiet}
            onChange={(e) => onChangeQuiet(e.target.checked)}
          />
          <label
            htmlFor="quiet-toggle"
            className="text-sm text-rf-ink-soft"
          >
            Quiet session (start muted)
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md border border-rf-line bg-rf-card text-rf-ink px-4 py-2 text-sm hover:bg-rf-line-soft"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            className="rounded-md bg-rf-primary px-4 py-2 text-sm font-medium text-rf-on-primary hover:bg-rf-primary-hover"
          >
            Confirm
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}
