"use client";

import { useEffect, useState } from "react";
import { CircleCheck, Loader2, X } from "lucide-react";

type Props = { open: boolean; onClose: () => void };

/** Small form for reporting a bug; posts to /api/bug-reports (emailed to the team). */
export default function BugReportDialog({ open, onClose }: Props) {
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!open) return;
    setError(null);
    setSent(false);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const tooShort = description.trim().length < 10;

  const submit = async () => {
    if (tooShort || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/bug-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description,
          pageUrl: window.location.href,
          viewport: `${window.innerWidth}×${window.innerHeight}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Couldn't send your report. Please try again.");
      setSent(true);
      setDescription("");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[90] flex items-end justify-center bg-black/50 p-4 sm:items-center">
      <button type="button" aria-label="Close" className="absolute inset-0 cursor-default" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="bug-report-title"
        className="relative w-full max-w-md rounded-2xl border border-rf-line bg-rf-card p-5 text-rf-ink shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="bug-report-title" className="text-base font-semibold">Report a bug</h2>
            <p className="mt-0.5 text-[13px] text-rf-ink-mute">
              Tell us what went wrong. It goes straight to the Refocus team.
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="grid h-7 w-7 place-items-center rounded-lg text-rf-ink-mute hover:bg-rf-line-soft">
            <X className="h-4 w-4" />
          </button>
        </div>

        {sent ? (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex gap-2.5 rounded-xl bg-rf-success-soft p-3">
              <CircleCheck className="mt-0.5 h-[18px] w-[18px] shrink-0 text-rf-success" />
              <p className="text-sm">Thanks! Your report was sent. We may reply by email if we need more details.</p>
            </div>
            <button type="button" onClick={onClose} className="rounded-[10px] border border-rf-line px-4 py-2 text-sm font-medium hover:bg-rf-line-soft">
              Done
            </button>
          </div>
        ) : (
          <>
            <label htmlFor="bug-description" className="mt-4 block text-xs font-medium text-rf-ink-soft">
              What happened, and what did you expect?
            </label>
            <textarea
              id="bug-description"
              autoFocus
              rows={5}
              maxLength={4000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. I clicked Join on my 4:30 PM session and the page stayed blank."
              className="mt-1.5 w-full resize-y rounded-[10px] border border-rf-line bg-rf-card px-3 py-2 text-sm text-rf-ink outline-none placeholder:text-rf-ink-mute focus-visible:ring-2 focus-visible:ring-rf-rose"
            />
            <p className="mt-1 text-[11.5px] text-rf-ink-mute">
              We&apos;ll include the page you&apos;re on and your browser to help us reproduce it.
            </p>
            {error ? <p className="mt-2 text-sm text-rf-danger">{error}</p> : null}
            <div className="mt-4 flex justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-[10px] border border-rf-line px-4 py-2 text-sm font-medium hover:bg-rf-line-soft">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={tooShort || busy}
                className="inline-flex items-center gap-1.5 rounded-[10px] bg-rf-primary px-4 py-2 text-sm font-semibold text-rf-on-primary hover:bg-rf-primary-hover disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Send report
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
