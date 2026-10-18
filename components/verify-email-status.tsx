"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { DButton, designStyles } from "@/components/design";

type Props = {
  token: string | null;
};

export function VerifyEmailStatus({ token }: Props) {
  const [checkingToken, setCheckingToken] = useState(!!token);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Read-only check — safe to run automatically, including if an email
  // security scanner prefetches this page. Nothing is consumed here.
  useEffect(() => {
    if (!token) {
      setCheckingToken(false);
      setTokenValid(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
        );
        const data = await res.json().catch(() => ({}));
        if (!cancelled) setTokenValid(!!data.valid);
      } catch {
        if (!cancelled) setTokenValid(false);
      } finally {
        if (!cancelled) setCheckingToken(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [token]);

  const handleConfirm = async () => {
    if (!token) return;
    setConfirming(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/verify-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to verify email");
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setConfirming(false);
    }
  };

  if (checkingToken) {
    return <p className={designStyles.pageSub}>Checking your verification link…</p>;
  }

  if (!token || tokenValid === false) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div>
          <h1 className={designStyles.pageTitle} style={{ fontSize: 28 }}>
            Link expired or invalid
          </h1>
          <p className={designStyles.pageSub} style={{ marginTop: 12, fontSize: 15 }}>
            This verification link doesn&apos;t work anymore. Sign in and resend
            a new link from your profile or settings.
          </p>
        </div>
        <Link href="/auth/login">
          <DButton variant="primary">Sign in</DButton>
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className={designStyles.avatar} aria-hidden="true">
          <CheckCircle2 size={28} />
        </div>
        <div>
          <h1 className={designStyles.pageTitle} style={{ fontSize: 28 }}>
            Email verified
          </h1>
          <p className={designStyles.pageSub} style={{ marginTop: 12, fontSize: 15 }}>
            Your email is verified. Thanks for helping keep your Refocus
            account secure.
          </p>
        </div>
        <Link href="/dashboard">
          <DButton variant="primary">Continue to dashboard</DButton>
        </Link>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <h1 className={designStyles.pageTitle} style={{ fontSize: 28 }}>
          Verify your email
        </h1>
        <p className={designStyles.pageSub} style={{ marginTop: 12, fontSize: 15 }}>
          Confirm below to verify your email address.
        </p>
      </div>

      {error && (
        <div className={`${designStyles.alert} ${designStyles.alertError}`}>
          {error}
        </div>
      )}

      <DButton variant="primary" disabled={confirming} onClick={handleConfirm}>
        {confirming ? "Verifying…" : "Confirm verification"}
      </DButton>
    </div>
  );
}
