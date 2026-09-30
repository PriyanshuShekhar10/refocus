"use client";

import { Calendar, MessageCircle, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AdminTag } from "@/components/admin-tag";

export type FriendData = {
  user_id: string;
  email?: string;
  name?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  isAdmin?: boolean;
  since?: string;
};

interface FriendRowProps {
  friend: FriendData;
  unread: number;
  onOpenChat: (friend: FriendData) => void;
  onBookSession: (friend: FriendData) => void;
  onOpenProfile?: (friend: FriendData) => void;
  onUnfriend?: (friend: FriendData) => void;
  unfriending?: boolean;
}

function formatSince(iso?: string): string | null {
  if (!iso) return null;
  const since = new Date(iso);
  const now = new Date();
  const days = Math.floor((now.getTime() - since.getTime()) / 86400000);
  if (days <= 0) return "Friends since today";
  if (days === 1) return "Friends · 1 day";
  if (days < 30) return `Friends · ${days} days`;
  const months = Math.floor(days / 30);
  if (months === 1) return "Friends · 1 month";
  if (months < 12) return `Friends · ${months} months`;
  const years = Math.floor(months / 12);
  return years === 1 ? "Friends · 1 year" : `Friends · ${years} years`;
}

export default function FriendRow({
  friend,
  unread,
  onOpenChat,
  onBookSession,
  onOpenProfile,
  onUnfriend,
  unfriending = false,
}: FriendRowProps) {
  const label = friend.email || friend.user_id;
  const displayName = friend.name || label;
  const initial = (displayName[0] ?? "?").toUpperCase();
  const sinceText = formatSince(friend.since);
  const handleLine = friend.username
    ? `@${friend.username}`
    : friend.email
      ? friend.email
      : null;

  const initials =
    displayName
      .split(/\s+/)
      .map((w) => w[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || initial;
  const tint = TINTS[hashId(friend.user_id) % TINTS.length];
  const meta = [handleLine, sinceText].filter(Boolean).join(" · ");
  const pill =
    "inline-flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full border px-3 text-[12.5px] font-medium transition-colors disabled:opacity-60";

  return (
    <div
      className="-mx-2 flex flex-wrap items-center gap-3 rounded-[10px] border-b px-2 py-3.5 transition-colors last:border-b-0 hover:bg-[var(--bg)]"
      style={{ borderColor: "var(--line-soft)" }}
    >
      <button
        type="button"
        onClick={() => onOpenProfile?.(friend)}
        disabled={!onOpenProfile}
        className="flex min-w-0 flex-[1_1_170px] items-center gap-3 text-left disabled:cursor-default"
      >
        <Avatar className="h-10 w-10 shrink-0">
          {friend.avatarUrl ? (
            <AvatarImage src={friend.avatarUrl} alt={displayName} />
          ) : null}
          <AvatarFallback className="text-sm font-medium text-rf-ink" style={{ background: tint }}>
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[14.5px] font-medium" style={{ color: "var(--ink)" }}>
              {displayName}
            </span>
            {friend.isAdmin ? <AdminTag /> : null}
            {unread > 0 ? (
              <span className="rounded-full bg-rf-primary px-[7px] py-px font-rf-mono text-[10px] font-semibold text-rf-on-primary">
                {unread}
              </span>
            ) : null}
          </div>
          {meta ? (
            <p className="truncate text-xs" style={{ color: "var(--ink-mute)" }}>
              {meta}
            </p>
          ) : null}
        </div>
      </button>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => onOpenChat(friend)}
          className={`${pill} border-rf-line bg-rf-card text-rf-ink hover:border-rf-ink-soft`}
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Chat
        </button>
        <button
          type="button"
          onClick={() => onBookSession(friend)}
          className={`${pill} border-rf-primary bg-rf-primary text-rf-on-primary hover:border-rf-primary-hover hover:bg-rf-primary-hover`}
        >
          <Calendar className="h-3.5 w-3.5" />
          Book session
        </button>
        {onUnfriend ? (
          <button
            type="button"
            onClick={() => onUnfriend(friend)}
            disabled={unfriending}
            title="Unfriend"
            aria-label={`Unfriend ${displayName}`}
            className="grid h-8 w-8 place-items-center rounded-full text-rf-ink-mute transition-colors hover:bg-rf-warn-soft hover:text-rf-warn disabled:opacity-60"
          >
            <UserMinus className="h-3.5 w-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}

const TINTS = [
  "var(--rf-tint-blush)",
  "var(--rf-tint-sage)",
  "var(--rf-tint-lavender)",
  "var(--rf-tint-butter)",
  "var(--rf-tint-sky)",
  "var(--rf-tint-clay)",
];

function hashId(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}
