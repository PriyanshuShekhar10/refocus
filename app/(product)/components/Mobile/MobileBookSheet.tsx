"use client";

import { DEFAULT_DURATION, type DurationMin } from "@/constants/calendar";
import { formatLocalDate } from "@/lib/localTime";

const BOOKABLE_DURATION: DurationMin = DEFAULT_DURATION;
const DURATION_UNAVAILABLE_HINT =
  "50-minute sessions only for now. We're keeping everyone on the same schedule to make matching easier. More durations are coming.";

export type BookSheetDay = { key: string; label: string; selected: boolean; pick: () => void };
export type BookSheetPart = {
  label: string;
  selected: boolean;
  disabled: boolean;
  pick: () => void;
};
export type BookSheetSlot = {
  minutes: number;
  label: string;
  busy: boolean;
  /** First name of someone waiting at this time (booking joins them). */
  openWith: string | null;
};

interface MobileBookSheetProps {
  open: boolean;
  onClose: () => void;
  days: BookSheetDay[];
  parts: BookSheetPart[];
  slots: BookSheetSlot[];
  selectedMinutes: number | null;
  onSelectSlot: (minutes: number) => void;
  quiet: boolean;
  onToggleQuiet: () => void;
  summary: string;
  onBook: () => void;
  booking?: boolean;
}

export function MobileBookSheet({
  open,
  onClose,
  days,
  parts,
  slots,
  selectedMinutes,
  onSelectSlot,
  quiet,
  onToggleQuiet,
  summary,
  onBook,
  booking = false,
}: MobileBookSheetProps) {
  if (!open) return null;

  const selected = slots.find((s) => s.minutes === selectedMinutes && !s.busy) ?? null;
  const matchNote = selected?.openWith
    ? `Matches ${selected.openWith}`
    : selected
      ? "Waits for a partner"
      : "";
  const bookLabel = !selected
    ? "Pick a time"
    : selected.openWith
      ? `Join ${selected.openWith} · ${BOOKABLE_DURATION} min`
      : `Book a ${BOOKABLE_DURATION} min session`;

  return (
    <div className="fixed inset-0 z-[65] flex items-end justify-center">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close booking sheet"
        onClick={onClose}
      />
      <div
        className="relative flex max-h-[88%] w-full flex-col overflow-hidden rounded-t-2xl border-t border-rf-line bg-rf-side-bg text-rf-ink shadow-[0_-10px_40px_rgba(0,0,0,.25)]"
        role="dialog"
        aria-modal="true"
        aria-label="Book a session"
      >
        <div className="flex justify-center pb-1 pt-3">
          <div className="h-1 w-10 rounded-full bg-rf-line" />
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-3 pt-1">
          <h2 className="text-lg font-semibold">Book a session</h2>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-rf-ink-soft">Date</span>
            <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 [scrollbar-width:none]">
              {days.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  onClick={d.pick}
                  aria-pressed={d.selected}
                  className={`min-h-10 shrink-0 whitespace-nowrap rounded-xl border px-3.5 text-[13.5px] font-medium ${
                    d.selected
                      ? "border-rf-ink bg-rf-ink text-rf-bg"
                      : "border-rf-line bg-rf-card text-rf-ink"
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-rf-ink-soft">Start time</span>
            <div className="grid grid-cols-3 gap-1 rounded-xl bg-rf-line-soft p-[3px]">
              {parts.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  onClick={p.pick}
                  disabled={p.disabled}
                  aria-pressed={p.selected}
                  className={`h-8 whitespace-nowrap rounded-[9px] text-[12.5px] font-medium disabled:opacity-40 ${
                    p.selected
                      ? "bg-rf-card text-rf-ink shadow-[0_1px_2px_rgba(0,0,0,0.08)]"
                      : "text-rf-ink-mute"
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {slots.length > 0 ? (
              <div className="mt-1 grid grid-cols-4 gap-1.5">
                {slots.map((t) => {
                  const on = t.minutes === selectedMinutes && !t.busy;
                  return (
                    <button
                      key={t.minutes}
                      type="button"
                      onClick={() => onSelectSlot(t.minutes)}
                      disabled={t.busy}
                      aria-pressed={on}
                      className={`flex h-[46px] flex-col items-center justify-center whitespace-nowrap rounded-[10px] border px-0.5 disabled:opacity-45 ${
                        on
                          ? "border-rf-primary bg-rf-primary text-rf-on-primary"
                          : t.openWith
                            ? "border-rf-online bg-rf-card text-rf-ink"
                            : "border-rf-line bg-rf-card text-rf-ink"
                      }`}
                    >
                      <span
                        className={`font-rf-mono text-[13px] font-medium ${t.busy ? "line-through" : ""}`}
                      >
                        {t.label}
                      </span>
                      <span
                        className={`max-w-full truncate text-[10px] leading-tight ${
                          on
                            ? "text-rf-on-primary"
                            : t.openWith
                              ? "text-rf-online"
                              : "text-rf-ink-mute"
                        }`}
                      >
                        {t.busy ? "Booked" : t.openWith ?? ""}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="py-1.5 text-center text-[13px] text-rf-ink-mute">
                No more slots in this part of the day.
              </p>
            )}
            <div className="flex items-center gap-1.5 text-[11.5px] text-rf-ink-mute">
              <span className="h-2 w-2 rounded-[3px] border-[1.5px] border-rf-online" />
              Someone&apos;s waiting at this time — you&apos;ll be matched
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-[13px] font-medium text-rf-ink-soft">Duration</span>
            <div className="grid grid-cols-3 gap-2">
              {([25, 50, 75] as DurationMin[]).map((d) => {
                const unavailable = d !== BOOKABLE_DURATION;
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={unavailable}
                    aria-disabled={unavailable || undefined}
                    aria-pressed={!unavailable}
                    className={`min-h-11 whitespace-nowrap rounded-xl text-sm ${
                      unavailable
                        ? "cursor-not-allowed border border-rf-line bg-rf-card text-rf-ink-mute opacity-40"
                        : "bg-rf-primary font-semibold text-rf-on-primary"
                    }`}
                  >
                    {d} min
                  </button>
                );
              })}
            </div>
            <p className="text-xs leading-snug text-rf-ink-mute">{DURATION_UNAVAILABLE_HINT}</p>
          </div>

          <button
            type="button"
            onClick={onToggleQuiet}
            role="switch"
            aria-checked={quiet}
            className="flex min-h-11 items-center justify-between gap-3 text-left"
          >
            <span className="text-sm font-medium">
              Quiet session <span className="font-normal text-rf-ink-mute">(start muted)</span>
            </span>
            <span
              className={`relative h-[22px] w-10 shrink-0 rounded-full transition-colors ${
                quiet ? "bg-rf-primary" : "bg-rf-line"
              }`}
            >
              <span
                className="absolute top-[3px] h-4 w-4 rounded-full bg-white shadow-[0_1px_2px_rgba(0,0,0,.2)] transition-[left]"
                style={{ left: quiet ? 21 : 3 }}
              />
            </span>
          </button>
        </div>

        <div
          className="border-t border-rf-line px-4 pt-3"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
        >
          <div className="mb-2 flex justify-between gap-2 text-[12.5px]">
            <span className="truncate text-rf-ink-soft">{summary}</span>
            <span
              className={`whitespace-nowrap font-medium ${
                selected?.openWith ? "text-rf-online" : "text-rf-ink-mute"
              }`}
            >
              {matchNote}
            </span>
          </div>
          <button
            type="button"
            onClick={onBook}
            disabled={!selected || booking}
            className="min-h-12 w-full whitespace-nowrap rounded-xl bg-rf-primary text-[14.5px] font-semibold text-rf-on-primary transition-colors hover:bg-rf-primary-hover disabled:opacity-50"
          >
            {booking ? "Booking…" : bookLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function bookSheetDateLabel(date: Date): string {
  return formatLocalDate(date, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
