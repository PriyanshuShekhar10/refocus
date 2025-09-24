"use client";

import React, { useMemo, useState } from "react";

/** Public props */
export type BookSessionButtonProps = {
  /** Shown in the modal as a hint; does not change duration. */
  defaultDurationMin?: 25 | 50 | 75;
  /** Called after user confirms with a valid future time. */
  onConfirm: (start: Date, quiet: boolean) => void;
  /** Button text override */
  label?: string;
  /** Optional className for the outer wrapper */
  className?: string;
};

/* ===== Local helpers (self-contained) ===== */
const pad = (n: number) => String(n).padStart(2, "0");
const ymd = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const roundUpToNext15 = (date: Date) => {
  const d = new Date(date);
  const mins = d.getMinutes();
  const next = Math.ceil(mins / 15) * 15;
  if (next === mins) return d;
  d.setMinutes(next, 0, 0);
  return d;
};

export default function BookSessionButton({
  defaultDurationMin = 25,
  onConfirm,
  label = "Book a session",
  className = "",
}: BookSessionButtonProps) {
  const [open, setOpen] = useState(false);
  const next15 = useMemo(() => roundUpToNext15(new Date()), []);

  // Inputs
  const [date, setDate] = useState<string>(ymd(next15));
  const [hour, setHour] = useState<number>(
    () => ((next15.getHours() + 11) % 12) + 1
  ); // 1..12
  const [minute, setMinute] = useState<number>(() => {
    const m = next15.getMinutes();
    return [0, 15, 30, 45].includes(m) ? m : 0;
  });
  const [ampm, setAmPm] = useState<"AM" | "PM">(
    next15.getHours() < 12 ? "AM" : "PM"
  );
  const [quiet, setQuiet] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const buildDate = () => {
    const [y, mo, d] = date.split("-").map((s) => parseInt(s, 10));
    let h = hour % 12;
    if (ampm === "PM") h += 12;
    const dt = new Date();
    dt.setFullYear(y);
    dt.setMonth(mo - 1);
    dt.setDate(d);
    dt.setHours(h, minute, 0, 0);
    return dt;
  };

  const resetAndOpen = () => {
    const n15 = roundUpToNext15(new Date());
    setDate(ymd(n15));
    setHour(((n15.getHours() + 11) % 12) + 1);
    setMinute(
      [0, 15, 30, 45].includes(n15.getMinutes()) ? n15.getMinutes() : 0
    );
    setAmPm(n15.getHours() < 12 ? "AM" : "PM");
    setQuiet(false);
    setError(null);
    setOpen(true);
  };

  const handleConfirm = () => {
    const candidate = buildDate();
    if (candidate <= new Date()) {
      setError(
        "Please choose a date & time in the future (after the current time)."
      );
      return;
    }
    setError(null);
    setOpen(false);
    onConfirm(candidate, quiet);
  };

  return (
    <div className={className}>
      <button
        onClick={resetAndOpen}
        className="w-full rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold">Book a session</h2>
            <p className="mt-2 text-sm text-gray-600">
              Choose a future date &amp; time. Time uses 12-hour format with
              15-minute steps.
            </p>

            <div className="mt-4 space-y-4">
              {/* Date */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Date
                </label>
                <input
                  type="date"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  min={ymd(new Date())}
                />
              </div>

              {/* Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Time
                </label>
                <div className="mt-1 flex gap-2">
                  <select
                    className="w-24 rounded-md border px-3 py-2 text-sm"
                    value={hour}
                    onChange={(e) => setHour(parseInt(e.target.value, 10))}
                  >
                    {Array.from({ length: 12 }).map((_, i) => {
                      const v = i + 1;
                      return (
                        <option key={v} value={v}>
                          {v}
                        </option>
                      );
                    })}
                  </select>
                  <span className="self-center text-sm text-gray-500">:</span>
                  <select
                    className="w-24 rounded-md border px-3 py-2 text-sm"
                    value={minute}
                    onChange={(e) => setMinute(parseInt(e.target.value, 10))}
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>
                        {pad(m)}
                      </option>
                    ))}
                  </select>
                  <select
                    className="w-24 rounded-md border px-3 py-2 text-sm"
                    value={ampm}
                    onChange={(e) => setAmPm(e.target.value as "AM" | "PM")}
                  >
                    {["AM", "PM"].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Quiet toggle */}
              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={quiet}
                  onChange={(e) => setQuiet(e.target.checked)}
                />
                Quiet mode (start muted)
              </label>

              {/* Duration hint */}
              <div className="rounded-md bg-gray-50 p-2 text-xs text-gray-600">
                Duration: <strong>{defaultDurationMin} minutes</strong>
              </div>

              {/* Error */}
              {error && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => setOpen(false)}
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
