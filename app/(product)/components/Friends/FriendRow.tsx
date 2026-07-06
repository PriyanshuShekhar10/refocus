"use client";

import { Calendar, MessageCircle, UserMinus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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

  return (
    <div className="flex flex-col gap-3 border-b border-border py-4 last:border-b-0 sm:flex-row sm:items-center">
      <button
        type="button"
        onClick={() => onOpenProfile?.(friend)}
        disabled={!onOpenProfile}
        className="flex min-w-0 flex-1 items-center gap-3 text-left disabled:cursor-default"
      >
        <Avatar className="h-10 w-10 shrink-0">
          {friend.avatarUrl ? (
            <AvatarImage src={friend.avatarUrl} alt={displayName} />
          ) : null}
          <AvatarFallback className="bg-muted text-sm font-medium">
            {initial}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium text-foreground">{displayName}</span>
            {friend.isAdmin ? <AdminTag /> : null}
            {unread > 0 ? (
              <span className="rounded-full bg-[#5D1C6A] px-2 py-0.5 text-[10px] font-semibold text-white">
                {unread}
              </span>
            ) : null}
          </div>
          {sinceText ? (
            <p className="text-xs text-muted-foreground">{sinceText}</p>
          ) : null}
          {handleLine ? (
            <p className="truncate text-xs text-muted-foreground">{handleLine}</p>
          ) : null}
        </div>
      </button>
      <div className="flex flex-wrap gap-2 sm:shrink-0">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onOpenChat(friend)}
          className="gap-1.5"
        >
          <MessageCircle className="h-3.5 w-3.5" />
          Chat
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={() => onBookSession(friend)}
          className="gap-1.5 bg-[#5D1C6A] hover:bg-[#CA5995]"
        >
          <Calendar className="h-3.5 w-3.5" />
          Book session
        </Button>
        {onUnfriend ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onUnfriend(friend)}
            disabled={unfriending}
            className="gap-1.5 text-red-600 hover:text-red-700 dark:text-red-400"
            aria-label={`Unfriend ${displayName}`}
          >
            <UserMinus className="h-3.5 w-3.5" />
            {unfriending ? "Removing…" : "Unfriend"}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
