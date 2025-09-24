"use client";

import React from "react";

export type CreatedSession = {
  id: string;
  start: string;
  end: string;
  durationMin: 25 | 50 | 75;
  sessionType: "focus" | "deep-work" | "learning";
  status: "available" | "booked" | "in-progress" | "completed";
};

type Props = {
  label?: string;
  className?: string;
  defaultDuration?: 25 | 50 | 75;
  defaultSessionType?: "focus" | "deep-work" | "learning";
  onCreated?: (session: CreatedSession) => void;
};

export default function BookSessionButton({
  label = "Book a session",
  className = "",
  defaultDuration = 25,
  defaultSessionType = "focus",
  onCreated,
}: Props) {
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [success, setSuccess] = React.useState<string | null>(null);

  const [duration, setDuration] = React.useState<25 | 50 | 75>(defaultDuration);
  const [sessionType, setSessionType] = React.useState<
    "focus" | "deep-work" | "learning"
  >(defaultSessionType);
  const [quietOwner, setQuietOwner] = React.useState(false);

  // --- helpers ---
  const pad = (n: number) => String(n).padStart(2, "0");

  // Compute default IST date + time (rounded *up* to the next 15-min mark)
  const defaults = React.useMemo(() => {
    const now = new Date();
    const istMs = now.getTime() + (5 * 60 + 30) * 60_000; // UTC -> IST
    const ist = new Date(istMs);
    const mins = ist.getMinutes();
    const next = Math.ceil((mins + 1) / 15) * 15;
    ist.setMinutes(next, 0, 0);

    const yyyy = ist.getFullYear();
    const mm = pad(ist.getMonth() + 1);
    const dd = pad(ist.getDate());

    let hour24 = ist.getHours(); // 0-23
    const minute = [0, 15, 30, 45].includes(ist.getMinutes())
      ? ist.getMinutes()
      : 0;

    // Convert to 12-hour parts
    const ampm: "AM" | "PM" = hour24 >= 12 ? "PM" : "AM";
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;

    return {
      dateIst: `${yyyy}-${mm}-${dd}`, // YYYY-MM-DD
      hour12: hour12 as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
      minute: minute as 0 | 15 | 30 | 45,
      ampm,
    };
  }, []);

  // --- state for date + time parts ---
  const [dateIst, setDateIst] = React.useState<string>(defaults.dateIst);
  const [hour12, setHour12] = React.useState<
    1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
  >(defaults.hour12);
  const [minute, setMinute] = React.useState<0 | 15 | 30 | 45>(defaults.minute);
  const [ampm, setAmpm] = React.useState<"AM" | "PM">(defaults.ampm);

  // IST parts -> ISO (UTC)
  const istPartsToIsoUtc = (
    dateYYYYMMDD: string,
    hour12Val: number,
    minuteVal: number,
    ampmVal: "AM" | "PM"
  ) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYYYYMMDD)) return null;

    // 12h -> 24h
    let hour24 = hour12Val % 12;
    if (ampmVal === "PM") hour24 += 12;

    const [y, m, d] = dateYYYYMMDD.split("-").map(Number);
    // IST is UTC+5:30 -> UTC = IST - 5:30
    const utcMs = Date.UTC(y, m - 1, d, hour24 - 5, minuteVal - 30, 0, 0);
    return new Date(utcMs).toISOString();
  };

  const addMinutesIso = (isoStart: string, minutes: number) => {
    const start = new Date(isoStart).getTime();
    return new Date(start + minutes * 60_000).toISOString();
  };

  const clampDuration = (d: number): 25 | 50 | 75 =>
    d <= 25 ? 25 : d <= 50 ? 50 : 75;

  // --- handlers ---
  const handleCreate = async () => {
    setError(null);
    setSuccess(null);

    // Only 15-min options are available in the UI, so no extra snapping needed
    const isoStart = istPartsToIsoUtc(dateIst, hour12, minute, ampm);
    if (!isoStart) {
      setError("Please pick a valid date & time.");
      return;
    }

    const durationMin = clampDuration(duration);
    const isoEnd = addMinutesIso(isoStart, durationMin);

    setBusy(true);
    try {
      const res = await fetch("/api/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          start: isoStart,
          durationMin,
          sessionType,
          quietOwner,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Failed to create session");

      onCreated?.({
        id: data?.id ?? "",
        start: isoStart,
        end: isoEnd,
        durationMin,
        sessionType,
        status: "available",
      });

      setSuccess("Session created!");
      setTimeout(() => {
        setOpen(false);
        setSuccess(null);
      }, 700);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button
        className={`w-full rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 ${className}`}
        onClick={() => setOpen(true)}
      >
        {label}
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                Book a session
              </h2>
              <button
                className="text-sm text-gray-500"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Date + 12-hour time in 15-min slots (IST) */}
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Date &amp; time (IST)
                </label>

                <div className="mt-1 grid grid-cols-2 gap-2">
                  {/* Date */}
                  <input
                    type="date"
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    value={dateIst}
                    onChange={(e) => setDateIst(e.target.value)}
                    disabled={busy}
                  />

                  {/* Time: hour / minute / AM-PM */}
                  <div className="grid grid-cols-3 gap-2">
                    {/* Hour 12h */}
                    <select
                      className="rounded-md border px-2 py-2 text-sm"
                      value={hour12}
                      onChange={(e) =>
                        setHour12(
                          Math.min(12, Math.max(1, Number(e.target.value))) as
                            | 1
                            | 2
                            | 3
                            | 4
                            | 5
                            | 6
                            | 7
                            | 8
                            | 9
                            | 10
                            | 11
                            | 12
                        )
                      }
                      disabled={busy}
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>

                    {/* Minute (15-min steps) */}
                    <select
                      className="rounded-md border px-2 py-2 text-sm"
                      value={minute}
                      onChange={(e) =>
                        setMinute(Number(e.target.value) as 0 | 15 | 30 | 45)
                      }
                      disabled={busy}
                    >
                      {[0, 15, 30, 45].map((m) => (
                        <option key={m} value={m}>
                          {pad(m)}
                        </option>
                      ))}
                    </select>

                    {/* AM/PM */}
                    <select
                      className="rounded-md border px-2 py-2 text-sm"
                      value={ampm}
                      onChange={(e) => setAmpm(e.target.value as "AM" | "PM")}
                      disabled={busy}
                    >
                      {["AM", "PM"].map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <p className="mt-1 text-[11px] text-gray-500">
                  Time uses 15-minute increments (Asia/Kolkata).
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Duration
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {[25, 50, 75].map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setDuration(m as 25 | 50 | 75)}
                      className={`rounded-md border px-3 py-2 text-sm ${
                        duration === m
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700"
                          : "border-gray-200"
                      }`}
                      disabled={busy}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Session type
                </label>
                <div className="mt-2 grid grid-cols-3 gap-2">
                  {(["focus", "deep-work", "learning"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setSessionType(t)}
                      className={`rounded-md border px-3 py-2 text-sm capitalize ${
                        sessionType === t
                          ? "border-green-600 bg-green-50 text-green-700"
                          : "border-gray-200"
                      }`}
                      disabled={busy}
                    >
                      {t.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 text-sm text-gray-700">
                <input
                  type="checkbox"
                  className="h-4 w-4"
                  checked={quietOwner}
                  onChange={(e) => setQuietOwner(e.target.checked)}
                  disabled={busy}
                />
                Quiet session (start muted for you)
              </label>

              {error && (
                <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">
                  {success}
                </div>
              )}
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-md border px-4 py-2 text-sm"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                onClick={handleCreate}
                disabled={busy}
              >
                {busy ? "Creating…" : "Create session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
