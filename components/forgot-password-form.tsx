"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, MailCheck } from "lucide-react";
import { DButton, Field, DInput, designStyles } from "@/components/design";

export function ForgotPasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // With NextAuth + credentials, implement your own email flow if needed.
      // For now, just show a success message to unblock the UI.
      setSuccess(true);
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div
        className={className}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
        {...props}
      >
        <div className={designStyles.avatar} aria-hidden="true">
          <MailCheck size={28} />
        </div>
        <div>
          <h1
            className={designStyles.pageTitle}
            style={{ fontSize: "clamp(24px, 4vw, 32px)" }}
          >
            Check your email.
          </h1>
          <p className={designStyles.pageSub} style={{ fontSize: 14 }}>
            If an account with that email exists, we&apos;ve sent a link to
            reset your password.
          </p>
        </div>
        <Link
          href="/auth/login"
          className={`${designStyles.btn} ${designStyles.btnGhost} ${designStyles.btnLg}`}
        >
          Back to login
        </Link>
      </div>
    );
  }

  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
      {...props}
    >
      <div>
        <span className={designStyles.eyebrow}>Forgot password</span>
        <h1
          className={designStyles.pageTitle}
          style={{ fontSize: "clamp(28px, 4vw, 36px)", marginTop: 12 }}
        >
          Reset it, quietly.
        </h1>
        <p
          className={designStyles.pageSub}
          style={{ marginTop: 10, fontSize: 14 }}
        >
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>
      </div>

      <form
        onSubmit={handleForgotPassword}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <Field label="Email" htmlFor="email">
          <DInput
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>

        {error && (
          <div className={`${designStyles.alert} ${designStyles.alertError}`}>
            {error}
          </div>
        )}

        <DButton
          type="submit"
          variant="primary"
          size="lg"
          full
          disabled={isLoading}
        >
          {isLoading ? (
            <>Sending…</>
          ) : (
            <>
              Send reset link
              <ArrowRight size={16} className={designStyles.arrow} />
            </>
          )}
        </DButton>
      </form>

      <p
        style={{
          textAlign: "center",
          fontSize: 13,
          color: "var(--ink-mute)",
        }}
      >
        Remembered it?{" "}
        <Link href="/auth/login" className={designStyles.link}>
          Back to login
        </Link>
      </p>
    </div>
  );
}
