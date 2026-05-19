"use client";
import Avatar, { tintForKey } from "./Avatar";
import styles from "./friends.module.css";

export type FriendData = {
  user_id: string;
  email?: string;
  name?: string | null;
  username?: string | null;
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
  if (days <= 0) return "FRIENDS · TODAY";
  if (days === 1) return "FRIENDS · 1 DAY";
  if (days < 30) return `FRIENDS · ${days} DAYS`;
  const months = Math.floor(days / 30);
  if (months === 1) return "FRIENDS · 1 MONTH";
  if (months < 12) return `FRIENDS · ${months} MONTHS`;
  const years = Math.floor(months / 12);
  return years === 1 ? "FRIENDS · 1 YEAR" : `FRIENDS · ${years} YEARS`;
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
  const tint = tintForKey(friend.user_id || displayName);
  const sinceText = formatSince(friend.since);
  const handleHeadline = friend.username
    ? `@${friend.username}`
    : friend.email
      ? friend.email.split("@")[0]
      : null;
  const handleTrail = friend.username && friend.email ? ` · ${friend.email}` : "";

  return (
    <div className={styles.friendRow}>
      <Avatar initial={initial} tint={tint} />
      <button
        type="button"
        onClick={() => onOpenProfile?.(friend)}
        disabled={!onOpenProfile}
        className={styles.friendMeta}
        style={{
          background: "none",
          border: "none",
          padding: 0,
          textAlign: "left",
          cursor: onOpenProfile ? "pointer" : "default",
          minWidth: 0,
        }}
      >
        <div className={styles.friendName}>
          <span>{displayName}</span>
          {sinceText ? (
            <span className={styles.statusText}>{sinceText}</span>
          ) : null}
          {unread > 0 ? <span className={styles.unread}>{unread}</span> : null}
        </div>
        {handleHeadline ? (
          <div className={styles.handle}>
            {handleHeadline}
            {handleTrail}
          </div>
        ) : null}
      </button>
      <div className={styles.rowActions}>
        <button
          type="button"
          className={styles.rowBtn}
          onClick={() => onOpenChat(friend)}
        >
          <svg
            className="ico"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ width: 13, height: 13 }}
          >
            <path d="M2.5 7.5C2.5 4.7 5 2.5 8 2.5s5.5 2.2 5.5 5-2.5 5-5.5 5c-.7 0-1.4-.1-2-.3l-2.5 1 .8-2.4c-1.1-.9-1.8-2-1.8-3.3z" />
          </svg>
          Chat
        </button>
        <button
          type="button"
          className={`${styles.rowBtn} ${styles.rowBtnPrimary}`}
          onClick={() => onBookSession(friend)}
        >
          <svg
            className="ico"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            style={{ width: 13, height: 13 }}
          >
            <rect x="2" y="3" width="12" height="11" rx="1.5" />
            <path d="M2 6h12M5 2v3M11 2v3" />
          </svg>
          Book session
        </button>
        {onUnfriend ? (
          <button
            type="button"
            className={`${styles.rowBtn} ${styles.rowBtnDanger}`}
            onClick={() => onUnfriend(friend)}
            disabled={unfriending}
            aria-label={`Unfriend ${displayName}`}
            title="Unfriend"
          >
            <svg
              className="ico"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              style={{ width: 13, height: 13 }}
            >
              <circle cx="6" cy="5" r="2.4" />
              <path d="M2 13c.4-2.2 2-3.3 4-3.3s3.6 1.1 4 3.3" />
              <path d="M10.5 5.5l4 4M14.5 5.5l-4 4" />
            </svg>
            {unfriending ? "Removing…" : "Unfriend"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
