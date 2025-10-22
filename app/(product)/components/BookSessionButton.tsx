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

  const pad = (n: number) => String(n).padStart(2, "0");

  // ---------- Helper: get current IST time ----------
  const getISTParts = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(new Date());

    const kv: Record<string, string> = {};
    for (const p of parts) {
      if (p.type !== "literal") kv[p.type] = p.value;
    }

    const year = Number(kv.year);
    const month = Number(kv.month);
    const day = Number(kv.day);
    const hour24 = Number(kv.hour);
    const minute = Number(kv.minute);

    return { year, month, day, hour24, minute };
  };

  // ---------- Defaults (next 15-min slot in IST) ----------
  const defaults = React.useMemo(() => {
    const { year, month, day, hour24, minute } = getISTParts();

    const nextMinute = Math.ceil((minute + 1) / 15) * 15;
    let hour = hour24;
    let minuteRounded = nextMinute;
    if (minuteRounded >= 60) {
      minuteRounded = 0;
      hour = (hour + 1) % 24;
    }

    const yyyy = year;
    const mm = String(month).padStart(2, "0");
    const dd = String(day).padStart(2, "0");

    const ampm: "AM" | "PM" = hour >= 12 ? "PM" : "AM";
    let hour12 = hour % 12;
    if (hour12 === 0) hour12 = 12;

    return {
      dateIst: `${yyyy}-${mm}-${dd}`,
      hour12: hour12 as 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12,
      minute: minuteRounded as 0 | 15 | 30 | 45,
      ampm,
    };
  }, []);

  // ---------- Reliable now & today in IST ----------
  const nowISTParts = React.useMemo(() => getISTParts(), []);
  const nowIST = React.useMemo(() => ({
    hour24: nowISTParts.hour24,
    minute: nowISTParts.minute,
    year: nowISTParts.year,
    month: nowISTParts.month,
    day: nowISTParts.day,
  }), [nowISTParts]);

  const todayIST = React.useMemo(() => {
    const yyyy = String(nowIST.year).padStart(4, "0");
    const mm = String(nowIST.month).padStart(2, "0");
    const dd = String(nowIST.day).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  }, [nowIST]);

  // ---------- States ----------
  const [dateIst, setDateIst] = React.useState<string>(defaults.dateIst);
  const [hour12, setHour12] = React.useState<
    1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12
  >(defaults.hour12);
  const [minute, setMinute] = React.useState<0 | 15 | 30 | 45>(defaults.minute);
  const [ampm, setAmpm] = React.useState<"AM" | "PM">(defaults.ampm);

  // ---------- Convert IST to UTC ----------
  const istPartsToIsoUtc = (
    dateYYYYMMDD: string,
    hour12Val: number,
    minuteVal: number,
    ampmVal: "AM" | "PM"
  ) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateYYYYMMDD)) return null;

    let hour24 = hour12Val % 12;
    if (ampmVal === "PM") hour24 += 12;

    const [y, m, d] = dateYYYYMMDD.split("-").map(Number);
    const utcMs = Date.UTC(y, m - 1, d, hour24 - 5, minuteVal - 30, 0, 0);
    return new Date(utcMs).toISOString();
  };

  // ---------- Add minutes ----------
  const addMinutesIso = (isoStart: string, minutes: number) => {
    const start = new Date(isoStart).getTime();
    return new Date(start + minutes * 60_000).toISOString();
  };

  // ---------- Past check ----------
  const isPast = React.useMemo(() => {
    const isoStart = istPartsToIsoUtc(dateIst, hour12, minute, ampm);
    if (!isoStart) return false;
    return new Date(isoStart).getTime() < Date.now();
  }, [dateIst, hour12, minute, ampm]);

  // ---------- Duration clamp ----------
  const clampDuration = (d: number): 25 | 50 | 75 =>
    d <= 25 ? 25 : d <= 50 ? 50 : 75;

  // ---------- Create handler ----------
  const handleCreate = async () => {
    setError(null);
    setSuccess(null);

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

  // ---------- Hour options ----------
  const hourOptions = React.useMemo(() => {
    const allHours = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    if (dateIst !== todayIST) return allHours;

    const currentHour24 = nowIST.hour24;
    const currentAmpm: "AM" | "PM" = currentHour24 >= 12 ? "PM" : "AM";

    if (ampm === "PM" && currentAmpm === "AM") return allHours;
    if (ampm === "AM" && currentAmpm === "PM") return [];

    const currentHour12 = currentHour24 % 12 === 0 ? 12 : currentHour24 % 12;
    return allHours.filter((h) => h >= currentHour12);
  }, [dateIst, ampm, nowIST, todayIST]);

  // ---------- Minute options ----------
  const minuteOptions = React.useMemo(() => {
    const allMinutes = [0, 15, 30, 45];
    if (dateIst !== todayIST) return allMinutes;

    const currentHour24 = nowIST.hour24;
    const currentMinute = nowIST.minute;
    const selectedHour24 = hour12 % 12 + (ampm === "PM" ? 12 : 0);

    if (selectedHour24 > currentHour24) return allMinutes;
    if (selectedHour24 < currentHour24) return [];
    return allMinutes.filter((m) => m > currentMinute);
  }, [dateIst, hour12, ampm, nowIST, todayIST]);

  // ---------- JSX ----------
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
          <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-200 dark:border-gray-800">
            <div className="flex items-start justify-between">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Book a session
              </h2>
              <button
                className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Close
              </button>
            </div>

            <div className="mt-4 space-y-4">
              {/* Date & Time */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Date &amp; time (IST)
                </label>
                <div className="mt-1 grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-3 py-2 text-sm"
                    value={dateIst}
                    min={todayIST}
                    onChange={(e) => setDateIst(e.target.value)}
                    disabled={busy}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <select
                      className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-2 py-2 text-sm"
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
                      {hourOptions.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>

                    <select
                      className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-2 py-2 text-sm"
                      value={minute}
                      onChange={(e) =>
                        setMinute(Number(e.target.value) as 0 | 15 | 30 | 45)
                      }
                      disabled={busy}
                    >
                      {minuteOptions.map((m) => (
                        <option key={m} value={m}>
                          {pad(m)}
                        </option>
                      ))}
                    </select>

                    <select
                      className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-white px-2 py-2 text-sm"
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
                <p className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">
                  Time uses 15-minute increments (Asia/Kolkata).
                </p>
              </div>

              {/* Duration */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                          ? "border-indigo-600 bg-indigo-50 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300"
                          : "border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                      }`}
                      disabled={busy}
                    >
                      {m} min
                    </button>
                  ))}
                </div>
              </div>

              {/* Session type */}
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
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
                          ? "border-green-600 bg-green-50 text-green-700 dark:bg-green-900 dark:text-green-300"
                          : "border-gray-300 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-300"
                      }`}
                      disabled={busy}
                    >
                      {t.replace("-", " ")}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quiet mode */}
              <label className="flex items-center gap-3 text-sm text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-gray-700 dark:accent-gray-300"
                  checked={quietOwner}
                  onChange={(e) => setQuietOwner(e.target.checked)}
                  disabled={busy}
                />
                Quiet session (start muted for you)
              </label>

              {/* Messages */}
              {error && (
                <div className="rounded-md bg-red-100 dark:bg-red-900/40 px-3 py-2 text-sm text-red-700 dark:text-red-300">
                  {error}
                </div>
              )}
              {success && (
                <div className="rounded-md bg-green-100 dark:bg-green-900/40 px-3 py-2 text-sm text-green-700 dark:text-green-300">
                  {success}
                </div>
              )}
            </div>

            {/* Buttons */}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
                onClick={() => setOpen(false)}
                disabled={busy}
              >
                Cancel
              </button>
              <button
                className="rounded-md bg-indigo-600 dark:bg-indigo-700 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 dark:hover:bg-indigo-800 disabled:opacity-50"
                onClick={handleCreate}
                disabled={busy || isPast}
              >
                {busy
                  ? "Creating…"
                  : isPast
                  ? "Cannot create past session"
                  : "Create session"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
