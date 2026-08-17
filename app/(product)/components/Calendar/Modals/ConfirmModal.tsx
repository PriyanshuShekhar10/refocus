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
      ? "rounded-md bg-[#5D1C6A] px-4 py-2 text-sm font-medium text-white hover:bg-[#CA5995] disabled:opacity-50"
      : "rounded-md bg-red-700 px-4 py-2 text-sm font-medium text-white hover:bg-red-800 disabled:opacity-50";
  return (
    <ModalWrapper onClose={onCancel}>
      <div className="w-full max-w-md rounded-lg bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-200 dark:border-gray-800 text-gray-900 dark:text-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {title}
        </h2>
        {description && (
          <div className="mt-3 text-sm text-gray-700 dark:text-gray-300">
            {description}
          </div>
        )}
        {messageField ? (
          <label className="mt-4 block">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {messageField.label}
            </span>
            <textarea
              value={message}
              maxLength={SESSION_CANCEL_MESSAGE_MAX}
              rows={3}
              placeholder={messageField.placeholder ?? "I’ll be out this afternoon…"}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1.5 w-full resize-none rounded-md border border-gray-200 bg-white px-3 py-2 text-sm text-gray-900 outline-none placeholder:text-gray-400 focus-visible:ring-1 focus-visible:ring-gray-400 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100 dark:placeholder:text-gray-600 dark:focus-visible:ring-white/30"
            />
          </label>
        ) : null}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-800"
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
