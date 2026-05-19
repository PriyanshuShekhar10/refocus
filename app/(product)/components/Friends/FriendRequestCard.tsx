"use client";
import Avatar, { tintForKey } from "./Avatar";
import styles from "./friends.module.css";

export type FriendRequestData = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  status: "pending" | "accepted" | "declined";
  created_at: string;
  from_user_email?: string;
  to_user_email?: string;
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
  const counterpartEmail =
    direction === "incoming" ? request.from_user_email : request.to_user_email;
  const counterpartId =
    direction === "incoming" ? request.from_user_id : request.to_user_id;
  const display = counterpartEmail || counterpartId;
  const initial = (display[0] ?? "?").toUpperCase();
  const tint = tintForKey(counterpartId || display);
  const handle = counterpartEmail
    ? `@${counterpartEmail.split("@")[0]}`
    : null;

  return (
    <div className={styles.reqCard}>
      <div className={styles.reqHead}>
        <Avatar initial={initial} tint={tint} size="sm" />
        <div className={styles.reqBody}>
          {direction === "incoming" ? (
            <>
              <span className="who" style={{ fontWeight: 500 }}>
                {display}
              </span>{" "}
              sent you a friend request
            </>
          ) : (
            <>
              You sent a request to{" "}
              <span className="who" style={{ fontWeight: 500 }}>
                {display}
              </span>
            </>
          )}
          <div className={styles.reqMeta}>
            {handle ? <span>{handle}</span> : null}
            {handle ? <span>·</span> : null}
            <span>{timeAgo(request.created_at)}</span>
          </div>
        </div>
      </div>
      <div className={styles.reqActions}>
        <span className={`${styles.chip} ${styles.chipPending}`}>Pending</span>
        {direction === "incoming" ? (
          <div className={styles.reqActionsRight}>
            <button
              type="button"
              className={`${styles.rowBtn} ${styles.rowBtnDanger}`}
              onClick={() => onDecline?.(request.id)}
            >
              Decline
            </button>
            <button
              type="button"
              className={`${styles.rowBtn} ${styles.rowBtnPrimary}`}
              onClick={() => onAccept?.(request.id)}
            >
              Accept
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
