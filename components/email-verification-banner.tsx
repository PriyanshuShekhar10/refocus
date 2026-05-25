"use client";

import { useState } from "react";
import { Mail, ShieldCheck, Loader2 } from "lucide-react";
import { DButton } from "@/components/design";

type Props = {
  email?: string | null;
  compact?: boolean;
};

export function EmailVerificationBanner({ email, compact = false }: Props) {
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleResend = async () => {
    setSending(true);
    setError(null);
    setSent(false);
    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to send email");
      }
      setSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSending(false);
    }
  };

  return (
    <div
      role="status"
      style={{
        display: "flex",
        flexDirection: compact ? "column" : "row",
        alignItems: compact ? "stretch" : "flex-start",
        gap: compact ? 12 : 16,
        padding: compact ? "14px 16px" : "16px 18px",
        borderRadius: 12,
        border: "1px solid var(--line)",
        background: "var(--accent-soft)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          gap: 12,
          flex: 1,
          minWidth: 0,
        }}
      >
        <Mail
          size={18}
          style={{ flexShrink: 0, marginTop: 2, color: "var(--ink-mute)" }}
          aria-hidden
        />
        <div>
          <p
            style={{
              margin: 0,
              fontSize: compact ? 13 : 14,
              fontWeight: 600,
              color: "var(--ink)",
            }}
          >
            Email not verified
          </p>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: compact ? 12 : 13,
              lineHeight: 1.5,
              color: "var(--ink-mute)",
            }}
          >
            {email
              ? `We sent a welcome email to ${email}. Verification is optional — your dashboard works either way.`
              : "Verify your email for a trusted profile badge. Optional — dashboard access is not blocked."}
          </p>
          {sent && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#047857" }}>
              Verification email sent. Check your inbox.
            </p>
          )}
          {error && (
            <p style={{ margin: "8px 0 0", fontSize: 12, color: "#b91c1c" }}>
              {error}
            </p>
          )}
        </div>
      </div>
      <DButton
        variant="ghost"
        size="sm"
        onClick={handleResend}
        disabled={sending}
        style={{ flexShrink: 0, alignSelf: compact ? "flex-start" : "center" }}
      >
        {sending ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <ShieldCheck size={14} />
        )}
        {sending ? "Sending…" : "Resend verification"}
      </DButton>
    </div>
  );
}

export function EmailVerifiedBadge() {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        fontSize: 11,
        fontWeight: 600,
        padding: "3px 8px",
        borderRadius: 999,
        background: "rgba(16, 185, 129, 0.12)",
        color: "#047857",
      }}
    >
      <ShieldCheck size={12} aria-hidden />
      Verified
    </span>
  );
}
