"use client";

import { useState, type ReactNode } from "react";
import { ModalWrapper } from "./ModalWrapper";
import { SESSION_CANCEL_MESSAGE_MAX } from "@/lib/sessionCancelMessage";
import type { CalendarEvent } from "@/types/calendar";

interface ConfirmModalProps {
  title: string;
  description?: ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "danger" | "success";
  messageField?: { label: string; placeholder?: string } | false;
  onCancel: () => void;
  onConfirm: (message?: string) => void | Promise<void>;
}

export function partnerNoteField(
  event: CalendarEvent,
  currentUserId: string | null,
): { label: string; placeholder: string } | false {
  const other = (event.participants ?? []).find(
    (p) => p.user_id !== currentUserId,
  );
  if (!other) return false;
  const name =
    [other.firstname, other.lastname].filter(Boolean).join(" ") ||
    other.username ||
    "your partner";
  return {
    label: `Leave a note for ${name} (optional, emailed)`,
    placeholder: "Something came up — sorry!",
  };
}

export function ConfirmModal({
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "danger",
  messageField = false,
  onCancel,
  onConfirm,
}: ConfirmModalProps) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const handleConfirm = async () => {
    try {
      setBusy(true);
      const note = messageField ? message.trim() : "";
      await onConfirm(note || undefined);
      onCancel();
    } finally {
      setBusy(false);
    }
  };

  const confirmClasses =
    confirmVariant === "success"
      ? "rf-btn-primary rounded-xl px-4 py-2 text-sm"
      : "rf-btn-primary rounded-xl bg-red-700 px-4 py-2 text-sm shadow-[0_3px_0_#7f1d1d] hover:bg-red-800";
  return (
    <ModalWrapper onClose={onCancel}>
      <div className="w-full max-w-md rounded-[20px] border-2 border-b-[5px] border-rf-chunk bg-rf-card p-6 text-rf-ink shadow-[0_30px_80px_-20px_rgba(0,0,0,.4)]">
        <h2 className="text-lg font-semibold text-rf-ink">
          {title}
        </h2>
        {description && (
          <div className="mt-3 text-sm text-rf-ink-soft">
            {description}
          </div>
        )}
        {messageField ? (
          <label className="mt-4 block">
            <span className="text-sm text-rf-ink-soft">
              {messageField.label}
            </span>
            <textarea
              value={message}
              maxLength={SESSION_CANCEL_MESSAGE_MAX}
              rows={3}
              placeholder={messageField.placeholder ?? "I’ll be out this afternoon…"}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1.5 w-full resize-none rounded-md border border-rf-line bg-rf-card px-3 py-2 text-sm text-rf-ink outline-none placeholder:text-rf-ink-mute focus-visible:ring-1 focus-visible:ring-gray-400 dark:focus-visible:ring-white/30"
            />
          </label>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rf-btn rounded-xl px-4 py-2 text-sm"
            onClick={onCancel}
            disabled={busy}
          >
            {cancelText}
          </button>
          <button
            className={confirmClasses}
            onClick={handleConfirm}
            disabled={busy}
          >
            {busy ? "Please wait…" : confirmText}
          </button>
        </div>
      </div>
    </ModalWrapper>
  );
}
