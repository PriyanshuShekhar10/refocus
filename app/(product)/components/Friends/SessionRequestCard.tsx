"use client";

import { ChangeEvent } from "react";
import { CalendarClock } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type SessionRequestData = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_user_name?: string | null;
  to_user_name?: string | null;
  from_user_avatar_url?: string | null;
  to_user_avatar_url?: string | null;
  start: string;
  durationMin: 25 | 50 | 75;
  message?: string | null;
  responseMessage?: string | null;
  status: "pending" | "accepted" | "declined";
  created_at?: string;
  responded_at?: string | null;
};

interface SessionRequestCardProps {
  request: SessionRequestData;
  direction: "incoming" | "outgoing";
  note?: string;
  onNoteChange?: (value: string) => void;
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
  onCancel?: (id: string) => void;
}

function formatStart(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function SessionRequestCard({
  request,
  direction,
  note = "",
  onNoteChange,
  onAccept,
  onDecline,
  onCancel,
}: SessionRequestCardProps) {
  const counterpartAvatar =
    direction === "incoming"
      ? request.from_user_avatar_url
      : request.to_user_avatar_url;
  const counterpartName =
    direction === "incoming" ? request.from_user_name : request.to_user_name;
  const display = counterpartName || "A Refocus member";
  const initial = (display[0] ?? "?").toUpperCase();

  const pill =
    "h-7 whitespace-nowrap rounded-full border px-2.5 text-xs font-medium transition-colors";

  return (
    <div
      className="mb-2.5 flex flex-col gap-2.5 rounded-xl border p-3.5 last:mb-0"
      style={{
        borderColor: "var(--line)",
        background:
          direction === "incoming"
            ? "color-mix(in srgb, var(--rf-cream-bg) 45%, var(--card))"
            : "var(--card)",
      }}
    >
      <div className="flex items-start gap-2.5">
        <Avatar className="h-[34px] w-[34px] shrink-0">
          {counterpartAvatar ? (
            <AvatarImage src={counterpartAvatar} alt={display} />
          ) : null}
          <AvatarFallback className="bg-rf-tint-blush text-xs font-medium text-rf-ink">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1 text-[13.5px] leading-[1.4]">
          <p className="break-words" style={{ color: "var(--ink)" }}>
            {direction === "incoming" ? (
              <>
                <span className="font-semibold">{display}</span> wants to focus with
                you
              </>
            ) : (
              <>
                <span className="font-semibold">You invited</span> {display}
              </>
            )}
          </p>
          <p
            className="mt-[3px] flex items-center gap-1.5 font-rf-mono text-[11.5px]"
            style={{ color: "var(--ink-mute)" }}
          >
            <CalendarClock className="h-3 w-3 shrink-0" aria-hidden />
            {formatStart(request.start)} · {request.durationMin} min
          </p>
        </div>
      </div>

      {request.message ? (
        <p
          className="border-l-2 pl-2.5 text-[13px] italic"
          style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}
        >
          “{request.message}”
        </p>
      ) : null}
      {request.responseMessage ? (
        <p
          className="border-l-2 pl-2.5 text-[13px] italic"
          style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}
        >
          Reply: “{request.responseMessage}”
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded-full bg-rf-amber-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-rf-amber-ink">
          {direction === "incoming" ? "Pending" : "Awaiting reply"}
        </span>
        {direction === "incoming" ? (
          <>
            <input
              type="text"
              placeholder="Optional note"
              value={note}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onNoteChange?.(e.target.value)
              }
              className="h-7 min-w-0 flex-[1_1_120px] rounded-full border px-2.5 text-xs outline-none"
              style={{
                borderColor: "var(--line)",
                background: "var(--card)",
                color: "var(--ink)",
              }}
            />
            <button
              type="button"
              onClick={() => onDecline?.(request.id)}
              className={`${pill} border-rf-line bg-rf-card text-rf-ink hover:bg-rf-line-soft`}
            >
              Decline
            </button>
            <button
              type="button"
              onClick={() => onAccept?.(request.id)}
              className={`${pill} border-rf-primary bg-rf-primary px-3 text-rf-on-primary hover:bg-rf-primary-hover`}
            >
              Accept
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => onCancel?.(request.id)}
            className={`${pill} ml-auto border-rf-warn bg-transparent text-rf-warn hover:bg-rf-warn-soft`}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
