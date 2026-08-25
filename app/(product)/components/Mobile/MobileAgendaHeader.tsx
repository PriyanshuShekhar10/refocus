"use client";

import { useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { formatLocalDate } from "@/lib/localTime";
import { ymdInTimeZone } from "@/lib/zonedTime";
import { useMobileAgendaColors } from "./mobileAgendaColors";

interface MobileAgendaHeaderProps {
  startDate: Date;
  timeZone: string;
  isToday: boolean;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  onSelectDate: (date: Date) => void;
}

export function MobileAgendaHeader({
  startDate,
  timeZone,
  isToday,
  onPrev,
  onNext,
  onToday,
  onSelectDate,
}: MobileAgendaHeaderProps) {
  const agenda = useMobileAgendaColors();
  const dateInputRef = useRef<HTMLInputElement>(null);
  const label = formatLocalDate(startDate, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
  const ymd = ymdInTimeZone(startDate, timeZone);

  return (
    <header
      className="shrink-0 px-2 py-2 [--agenda-hover:var(--agenda-hover-color)]"
      style={
        {
          borderBottom: `1px solid ${agenda.border}`,
          "--agenda-hover-color": agenda.hover,
        } as React.CSSProperties
      }
    >
      <div className="flex items-center justify-between gap-1">
        <button
          type="button"
          onClick={onPrev}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-[var(--agenda-hover-color)]"
          style={{ color: agenda.textSecondary }}
          aria-label="Previous day"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <button
          type="button"
          onClick={() => {
            const el = dateInputRef.current;
            if (!el) return;
            if (typeof el.showPicker === "function") {
              el.showPicker();
            } else {
              el.click();
            }
          }}
          className="min-h-11 flex-1 rounded-xl px-2 text-center text-base font-semibold transition-colors hover:bg-[var(--agenda-hover-color)]"
          style={{ color: agenda.text }}
          aria-label="Pick a date"
        >
          {label}
        </button>

        <input
          ref={dateInputRef}
          type="date"
          value={ymd}
          onChange={(e) => {
            const value = e.target.value;
            if (!value) return;
            const [y, m, d] = value.split("-").map(Number);
            if (!y || !m || !d) return;
            onSelectDate(new Date(y, m - 1, d, 12, 0, 0));
          }}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />

        <button
          type="button"
          onClick={onNext}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors hover:bg-[var(--agenda-hover-color)]"
          style={{ color: agenda.textSecondary }}
          aria-label="Next day"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      {!isToday && (
        <div className="mt-1 flex justify-center pb-1">
          <button
            type="button"
            onClick={onToday}
            className="min-h-9 rounded-lg px-4 py-1.5 text-sm font-medium transition-colors"
            style={{
              backgroundColor: agenda.plumSoft,
              color: agenda.plumMuted,
            }}
          >
            Today
          </button>
        </div>
      )}
    </header>
  );
}
