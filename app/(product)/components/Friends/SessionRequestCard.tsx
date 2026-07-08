"use client";

import { ChangeEvent } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export type SessionRequestData = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_user_email?: string;
  to_user_email?: string;
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
  const counterpartEmail =
    direction === "incoming" ? request.from_user_email : request.to_user_email;
  const counterpartId =
    direction === "incoming" ? request.from_user_id : request.to_user_id;
  const display = counterpartEmail || counterpartId;
  const initial = (display[0] ?? "?").toUpperCase();

  return (
    <div
      className="mb-3 rounded-xl border p-4"
      style={{
        borderColor: "var(--line)",
        background: "var(--line-soft)",
      }}
    >
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          {counterpartAvatar ? (
            <AvatarImage src={counterpartAvatar} alt={display} />
          ) : null}
          <AvatarFallback className="bg-muted text-xs">{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm" style={{ color: "var(--ink)" }}>
            {direction === "incoming" ? (
              <>
                <span className="font-medium">{display}</span> wants to focus with
                you
              </>
            ) : (
              <>
                You invited <span className="font-medium">{display}</span>
              </>
            )}
          </p>
          <p className="mt-1 text-xs" style={{ color: "var(--ink-mute)" }}>
            {formatStart(request.start)} · {request.durationMin} min
          </p>
        </div>
      </div>

      {request.message ? (
        <p
          className="mt-3 border-l-2 pl-3 text-sm italic"
          style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}
        >
          “{request.message}”
        </p>
      ) : null}
      {request.responseMessage ? (
        <p
          className="mt-2 border-l-2 pl-3 text-sm italic"
          style={{ borderColor: "var(--line)", color: "var(--ink-soft)" }}
        >
          Reply: “{request.responseMessage}”
        </p>
      ) : null}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          {direction === "incoming" ? "Pending" : "Awaiting reply"}
        </span>
        {direction === "incoming" ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
            <input
              type="text"
              placeholder="Optional note"
              value={note}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onNoteChange?.(e.target.value)
              }
              className="h-8 min-w-[140px] flex-1 rounded-lg border px-3 text-xs outline-none sm:flex-none"
              style={{
                borderColor: "var(--line)",
                background: "var(--card)",
                color: "var(--ink)",
              }}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onDecline?.(request.id)}
            >
              Decline
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={() => onAccept?.(request.id)}
              className="bg-[#5D1C6A] hover:bg-[#CA5995]"
            >
              Accept
            </Button>
          </div>
        ) : (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onCancel?.(request.id)}
            className="ml-auto text-red-600 hover:text-red-700 dark:text-red-400"
          >
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}
