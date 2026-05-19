"use client";
import { ChangeEvent } from "react";
import Avatar, { tintForKey } from "./Avatar";
import styles from "./friends.module.css";

export type SessionRequestData = {
  id: string;
  from_user_id: string;
  to_user_id: string;
  from_user_email?: string;
  to_user_email?: string;
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
  const counterpartEmail =
    direction === "incoming" ? request.from_user_email : request.to_user_email;
  const counterpartId =
    direction === "incoming" ? request.from_user_id : request.to_user_id;
  const display = counterpartEmail || counterpartId;
  const initial = (display[0] ?? "?").toUpperCase();
  const tint = tintForKey(counterpartId || display);

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
              wants to focus with you
            </>
          ) : (
            <>
              You invited{" "}
              <span className="who" style={{ fontWeight: 500 }}>
                {display}
              </span>
            </>
          )}
          <div className={styles.reqMeta}>
            <span>{formatStart(request.start)}</span>
            <span>·</span>
            <span>{request.durationMin} min</span>
          </div>
        </div>
      </div>

      {request.message ? (
        <div className={styles.reqQuote}>“{request.message}”</div>
      ) : null}
      {request.responseMessage ? (
        <div className={styles.reqQuote}>
          Reply: “{request.responseMessage}”
        </div>
      ) : null}

      <div className={styles.reqActions}>
        <span className={`${styles.chip} ${styles.chipPending}`}>
          {direction === "incoming" ? "Pending" : "Awaiting reply"}
        </span>
        {direction === "incoming" ? (
          <div
            className={styles.reqActionsRight}
            style={{ flexWrap: "wrap", gap: 8 }}
          >
            <input
              type="text"
              placeholder="Optional note"
              className={styles.noteInput}
              value={note}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                onNoteChange?.(e.target.value)
              }
            />
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
        ) : (
          <button
            type="button"
            className={`${styles.rowBtn} ${styles.rowBtnDanger}`}
            style={{ marginLeft: "auto" }}
            onClick={() => onCancel?.(request.id)}
          >
            Cancel
          </button>
        )}
      </div>
    </div>
  );
}
