"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { validatePassword } from "@/lib/validatePassword";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import {
  DButton,
  Field,
  DPasswordInput,
  designStyles,
} from "@/components/design";

type Props = React.ComponentPropsWithoutRef<"div"> & {
  token: string | null;
};

export function ResetPasswordForm({ token, className, ...props }: Props) {
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingToken, setCheckingToken] = useState(!!token);
  const [tokenValid, setTokenValid] = useState<boolean | null>(null);
  const [success, setSuccess] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState(
    validatePassword(""),
  );
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPasswordValidation(validatePassword(password));
    }, 300);
    return () => clearTimeout(timeout);
  }, [password]);

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
          `/api/auth/reset-password?token=${encodeURIComponent(token)}`,
        );
        const data = await res.json();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  if (checkingToken) {
    return (
      <div className={className} {...props}>
        <p className={designStyles.pageSub}>Checking your reset link…</p>
      </div>
    );
  }

  if (!token || tokenValid === false) {
    return (
      <div
        className={className}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
        {...props}
      >
        <div>
          <h1
            className={designStyles.pageTitle}
            style={{ fontSize: "clamp(24px, 4vw, 32px)" }}
          >
            Link expired or invalid
          </h1>
          <p className={designStyles.pageSub} style={{ fontSize: 14 }}>
            Request a new password reset link from the login page.
          </p>
        </div>
        <Link
          href="/auth/forgot-password"
          className={`${designStyles.btn} ${designStyles.btnPrimary} ${designStyles.btnLg}`}
        >
          Request new link
        </Link>
      </div>
    );
  }

  if (success) {
    return (
      <div
        className={className}
        style={{ display: "flex", flexDirection: "column", gap: 20 }}
        {...props}
      >
        <div className={designStyles.avatar} aria-hidden="true">
          <CheckCircle2 size={28} />
        </div>
        <div>
          <h1
            className={designStyles.pageTitle}
            style={{ fontSize: "clamp(24px, 4vw, 32px)" }}
          >
            Password updated
          </h1>
          <p className={designStyles.pageSub} style={{ fontSize: 14 }}>
            You can sign in with your new password now.
          </p>
        </div>
        <DButton
          variant="primary"
          size="lg"
          full
          onClick={() => router.push("/auth/login")}
        >
          Go to sign in
        </DButton>
      </div>
    );
  }

  const isWeak = passwordValidation.strength === "weak";

  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
      {...props}
    >
      <div>
        <span className={designStyles.eyebrow}>New password</span>
        <h1
          className={designStyles.pageTitle}
          style={{ fontSize: "clamp(28px, 4vw, 36px)", marginTop: 12 }}
        >
          Choose a new password
        </h1>
        <p
          className={designStyles.pageSub}
          style={{ marginTop: 10, fontSize: 14 }}
        >
          Pick something strong you haven&apos;t used here before.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <Field label="New password" htmlFor="password">
          <DPasswordInput
            id="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <PasswordStrengthMeter validation={passwordValidation} />
        </Field>

        <Field label="Confirm password" htmlFor="repeat-password">
          <DPasswordInput
            id="repeat-password"
            required
            autoComplete="new-password"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
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
          disabled={isLoading || isWeak}
        >
          {isLoading ? (
            <>Updating…</>
          ) : (
            <>
              Update password
              <ArrowRight size={16} className={designStyles.arrow} />
            </>
          )}
        </DButton>
      </form>
    </div>
  );
}
