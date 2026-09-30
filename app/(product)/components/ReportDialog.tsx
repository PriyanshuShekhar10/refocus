"use client";

import { useState } from "react";
import { Loader2, X } from "lucide-react";
import {
  REPORT_REASON_LABELS,
  REPORT_REASONS,
  type ReportReason,
  type ReportTargetType,
} from "@/lib/reportConstants";

type Props = {
  open: boolean;
  onClose: () => void;
  targetType: ReportTargetType;
  targetId: string;
  reportedUserId?: string;
  reportedLabel?: string;
  contentPreview?: string;
  onSuccess?: () => void;
};

export default function ReportDialog({
  open,
  onClose,
  targetType,
  targetId,
  reportedUserId,
  reportedLabel,
  contentPreview,
  onSuccess,
}: Props) {
  const [reason, setReason] = useState<ReportReason>("harassment");
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!open) return null;

  const handleClose = () => {
    if (busy) return;
    setError(null);
    setSuccess(false);
    setDetails("");
    setReason("harassment");
    onClose();
  };

  const handleSubmit = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetType,
          targetId,
          reason,
          details: details.trim() || undefined,
          reportedUserId,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Failed to submit report");
      setSuccess(true);
      onSuccess?.();
      setTimeout(handleClose, 1200);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div
        className="w-full max-w-md rounded-xl border border-rf-line bg-rf-card shadow-xl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="report-dialog-title"
      >
        <div className="flex items-start justify-between border-b border-rf-line px-4 py-3">
          <div>
            <h2
              id="report-dialog-title"
              className="text-base font-semibold text-rf-ink"
            >
              Report {reportedLabel ? reportedLabel : "content"}
            </h2>
            <p className="mt-0.5 text-xs text-rf-ink-mute">
              Our team will review this report.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            disabled={busy}
            className="rounded-lg p-1 text-rf-ink-mute hover:bg-rf-line-soft hover:text-rf-ink"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          {contentPreview ? (
            <div className="rounded-lg bg-rf-bg px-3 py-2 text-xs text-rf-ink-soft">
              <p className="mb-1 font-medium text-rf-ink-mute">
                Preview
              </p>
              <p className="whitespace-pre-wrap break-words">{contentPreview}</p>
            </div>
          ) : null}

          {success ? (
            <p className="text-sm text-green-600 dark:text-green-400">
              Thanks — we&apos;ll review this report.
            </p>
          ) : (
            <>
              <fieldset className="space-y-2">
                <legend className="text-xs font-medium uppercase tracking-wide text-rf-ink-mute">
                  Reason
                </legend>
                {REPORT_REASONS.map((r) => (
                  <label
                    key={r}
                    className="flex cursor-pointer items-center gap-2 rounded-lg border border-rf-line px-3 py-2 text-sm has-[:checked]:border-[#5D1C6A] has-[:checked]:bg-[#5D1C6A]/5"
                  >
                    <input
                      type="radio"
                      name="report-reason"
                      value={r}
                      checked={reason === r}
                      onChange={() => setReason(r)}
                      className="accent-rf-primary"
                    />
                    <span className="text-rf-ink">
                      {REPORT_REASON_LABELS[r]}
                    </span>
                  </label>
                ))}
              </fieldset>

              <div>
                <label
                  htmlFor="report-details"
                  className="text-xs font-medium uppercase tracking-wide text-rf-ink-mute"
                >
                  Additional details (optional)
                </label>
                <textarea
                  id="report-details"
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  rows={3}
                  maxLength={500}
                  placeholder="Anything else we should know?"
                  className="mt-1.5 w-full rounded-lg border border-rf-line bg-rf-card px-3 py-2 text-sm text-rf-ink placeholder:text-rf-ink-mute"
                />
              </div>

              {error ? (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              ) : null}
            </>
          )}
        </div>

        {!success ? (
          <div className="flex justify-end gap-2 border-t border-rf-line px-4 py-3">
            <button
              type="button"
              onClick={handleClose}
              disabled={busy}
              className="rounded-lg border border-rf-line px-4 py-2 text-sm font-medium text-rf-ink-soft hover:bg-rf-line-soft"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy}
              className="inline-flex items-center gap-2 rounded-lg bg-rf-primary px-4 py-2 text-sm font-medium text-rf-on-primary hover:bg-rf-primary-hover disabled:opacity-50"
            >
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Submit report
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
