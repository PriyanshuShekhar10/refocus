"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export type FriendRequestData = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  from_user_name?: string | null;
  to_user_name?: string | null;
  from_user_avatar_url?: string | null;
  to_user_avatar_url?: string | null;
};

interface FriendRequestCardProps {
  request: FriendRequestData;
  direction: "incoming" | "outgoing";
  onAccept?: (id: string) => void;
  onDecline?: (id: string) => void;
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  const diff = (Date.now() - d.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days < 7) return `${days}d ago`;
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export default function FriendRequestCard({
  request,
  direction,
  onAccept,
  onDecline,
}: FriendRequestCardProps) {
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
      className="mb-2.5 flex flex-wrap items-center gap-2.5 rounded-xl border px-3.5 py-3 last:mb-0"
      style={{ borderColor: "var(--line)" }}
    >
      <Avatar className="h-[34px] w-[34px] shrink-0">
        {counterpartAvatar ? (
          <AvatarImage src={counterpartAvatar} alt={display} />
        ) : null}
        <AvatarFallback className="bg-rf-tint-sky text-xs font-medium text-rf-ink">
          {initial}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-[1_1_130px] text-[13.5px] leading-[1.4]">
        <p className="break-words" style={{ color: "var(--ink)" }}>
          {direction === "incoming"
            ? `${display} sent you a friend request`
            : `You sent a request to ${display}`}
        </p>
        <p className="text-xs" style={{ color: "var(--ink-mute)" }}>
          {timeAgo(request.created_at)}
        </p>
      </div>
      {direction === "incoming" ? (
        <div className="flex gap-1.5">
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
        </div>
      ) : (
        <span className="rounded-full bg-rf-amber-bg px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.04em] text-rf-amber-ink">
          Pending
        </span>
      )}
    </div>
  );
}
