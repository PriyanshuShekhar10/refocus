import React from "react";
import type { CalendarEvent } from "@/types/calendar";

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
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-900 p-6 shadow-2xl border border-gray-200 dark:border-gray-800">
        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
          Confirm Booking
        </h2>
        <p className="mt-2 text-gray-700 dark:text-gray-300">
          You are booking a{" "}
          <strong className="text-indigo-700 dark:text-indigo-300">
            {event.durationMin}-minute {event.sessionType}
          </strong>{" "}
          session for:
        </p>
        <div className="mt-4 rounded-md bg-gray-100 dark:bg-gray-900/60 p-3 text-center font-medium text-gray-900 dark:text-gray-100">
          {new Date(event.start).toLocaleString("en-IN", {
            weekday: "long",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            timeZone: "Asia/Kolkata",
          })}
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
            className="text-sm text-gray-700 dark:text-gray-200"
          >
            Quiet session (start muted)
          </label>
        </div>

        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="rounded-md bg-indigo-600 dark:bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-800"
          >
            Confirm
          </button>
        </div>
      </div>
    </div>
  );
}
