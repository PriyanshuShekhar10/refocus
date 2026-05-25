"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";

export function EmailVerificationStrip() {
  const [verified, setVerified] = useState<boolean | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/users/me");
      if (!res.ok) return;
      const data = await res.json();
      setVerified(!!data?.user?.emailVerified);
    } catch {
      setVerified(null);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  const handleSend = async () => {
    setSending(true);
    setError(null);
    setSent(false);
    try {
      const res = await fetch("/api/auth/resend-verification", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to send verification email");
      }
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  if (verified !== false) return null;

  return (
    <div
      role="status"
      className="flex shrink-0 items-center justify-between gap-3 border-b border-[#e5e7eb] bg-[#e1e8f0]/90 px-4 py-2 dark:border-gray-700 dark:bg-slate-800/90"
    >
      <div className="flex min-w-0 items-center gap-2 text-xs text-gray-700 dark:text-gray-300">
        <Mail size={14} className="shrink-0 text-gray-500 dark:text-gray-400" aria-hidden />
        <span className="truncate font-medium">
          {sent
            ? "Verification email sent — check your inbox."
            : error
              ? error
              : "Verify email — unlocks a trusted profile badge and other features."}
        </span>
      </div>
      <button
        type="button"
        onClick={handleSend}
        disabled={sending || sent}
        className="shrink-0 rounded-md bg-[#0a0a0a] px-3 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-[#2a2a2a] disabled:cursor-not-allowed disabled:opacity-60 dark:bg-[#CA5995] dark:hover:bg-[#5D1C6A]"
      >
        {sending ? (
          <span className="inline-flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" />
            Sending…
          </span>
        ) : sent ? (
          "Sent"
        ) : (
          "Send verification link"
        )}
      </button>
    </div>
  );
}
