"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export type FriendRequestData = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  from_user_email?: string;
  to_user_email?: string;
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
  const counterpartEmail =
    direction === "incoming" ? request.from_user_email : request.to_user_email;
  const counterpartId =
    direction === "incoming" ? request.from_user_id : request.to_user_id;
  const display = counterpartEmail || counterpartId;
  const initial = (display[0] ?? "?").toUpperCase();

  return (
    <div className="mb-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start gap-3">
        <Avatar className="h-9 w-9 shrink-0">
          {counterpartAvatar ? (
            <AvatarImage src={counterpartAvatar} alt={display} />
          ) : null}
          <AvatarFallback className="bg-muted text-xs">{initial}</AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-foreground">
            {direction === "incoming" ? (
              <>
                <span className="font-medium">{display}</span> sent you a friend
                request
              </>
            ) : (
              <>
                You sent a request to{" "}
                <span className="font-medium">{display}</span>
              </>
            )}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {timeAgo(request.created_at)}
          </p>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-800 dark:bg-amber-950/50 dark:text-amber-200">
          Pending
        </span>
        {direction === "incoming" ? (
          <div className="ml-auto flex gap-2">
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
        ) : null}
      </div>
    </div>
  );
}
