"use client";

import type { DurationMin } from "@/constants/calendar";
import { formatLocalDate } from "@/lib/localTime";
import { useMobileAgendaColors } from "./mobileAgendaColors";

interface MobileBookSheetProps {
  open: boolean;
  onClose: () => void;
  dateLabel: string;
  bookTime: string;
  onBookTimeChange: (value: string) => void;
  createDuration: DurationMin;
  onDurationChange: (d: DurationMin) => void;
  block25: boolean;
  timeStepMinutes: number;
  onBook: () => void;
  onPickDate?: () => void;
}

export function MobileBookSheet({
  open,
  onClose,
  dateLabel,
  bookTime,
  onBookTimeChange,
  createDuration,
  onDurationChange,
  block25,
  timeStepMinutes,
  onBook,
  onPickDate,
}: MobileBookSheetProps) {
  const agenda = useMobileAgendaColors();
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[55] lg:hidden">
      <button
        type="button"
        className="absolute inset-0 bg-black/50"
        aria-label="Close booking sheet"
        onClick={onClose}
      />
      <div
        className="absolute bottom-0 left-0 right-0 max-h-[85vh] overflow-y-auto rounded-t-2xl shadow-2xl"
        style={{
          paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))",
          backgroundColor: agenda.elevated,
          borderTop: `1px solid ${agenda.border}`,
          color: agenda.text,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Book a session"
      >
        <div className="flex justify-center py-3">
          <div
            className="h-1 w-10 rounded-full"
            style={{ backgroundColor: agenda.border }}
          />
        </div>

        <div className="space-y-5 px-4 pb-4">
          <h2 className="text-lg font-semibold" style={{ color: agenda.text }}>
            Book a session
          </h2>

          <div className="space-y-1.5">
            <p
              className="text-sm font-medium"
              style={{ color: agenda.textSecondary }}
            >
              Date
            </p>
            <button
              type="button"
              onClick={onPickDate}
              className="flex min-h-11 w-full items-center rounded-xl border px-4 text-left text-base font-medium"
              style={{
                borderColor: agenda.border,
                backgroundColor: agenda.card,
                color: agenda.text,
              }}
            >
              {dateLabel}
            </button>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="mobile-agenda-book-time"
              className="text-sm font-medium"
              style={{ color: agenda.textSecondary }}
            >
              Start time
            </label>
            <input
              id="mobile-agenda-book-time"
              type="time"
              step={timeStepMinutes * 60}
              value={bookTime}
              onChange={(e) => onBookTimeChange(e.target.value)}
              className="min-h-11 w-full rounded-xl border px-4 text-base"
              style={{
                borderColor: agenda.border,
                backgroundColor: agenda.card,
                color: agenda.text,
                colorScheme: agenda.colorScheme,
              }}
            />
          </div>

          <div className="space-y-1.5">
            <p
              className="text-sm font-medium"
              style={{ color: agenda.textSecondary }}
            >
              Duration
            </p>
            <div className="grid grid-cols-3 gap-2">
              {([25, 50, 75] as DurationMin[]).map((d) => {
                const blocked = block25 && d === 25;
                const selected = createDuration === d;
                return (
                  <button
                    key={d}
                    type="button"
                    disabled={blocked}
                    onClick={() => !blocked && onDurationChange(d)}
                    title={
                      blocked ? "25-minute sessions are unavailable" : undefined
                    }
                    className="min-h-11 rounded-xl text-center text-sm transition-all disabled:cursor-not-allowed disabled:opacity-40"
                    style={
                      blocked
                        ? {
                            backgroundColor: agenda.card,
                            color: agenda.textMuted,
                          }
                        : selected
                          ? {
                              backgroundColor: agenda.plumCta,
                              color: "#fff",
                              fontWeight: 600,
                            }
                          : {
                              backgroundColor: agenda.card,
                              color: agenda.text,
                              border: `1px solid ${agenda.border}`,
                            }
                    }
                  >
                    {d} min
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={onBook}
            className="min-h-12 w-full rounded-xl py-3.5 text-sm font-semibold text-white transition-colors hover:bg-[#5F2066]"
            style={{ backgroundColor: agenda.plumCta }}
          >
            Book a {createDuration} min session
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
