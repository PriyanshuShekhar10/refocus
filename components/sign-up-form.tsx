"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { validatePassword } from "@/lib/validatePassword";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import {
  DButton,
  Field,
  DInput,
  DPasswordInput,
  designStyles,
} from "@/components/design";

export function SignUpForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [repeatPassword, setRepeatPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [passwordValidation, setPasswordValidation] = useState<
    ReturnType<typeof validatePassword>
  >(validatePassword(""));
  const router = useRouter();

  useEffect(() => {
    const timeout = setTimeout(() => {
      setPasswordValidation(validatePassword(password));
    }, 300);
    return () => clearTimeout(timeout);
  }, [password]);

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    if (password !== repeatPassword) {
      setError("Passwords do not match");
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, firstName, lastName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to register");
      const login = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      if (login?.error) throw new Error(login.error);

      router.push("/dashboard?new=true");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  const isPasswordWeak = passwordValidation.strength === "weak";

  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
      {...props}
    >
      <div>
        <span className={designStyles.eyebrow}>Create account</span>
        <h1
          className={designStyles.pageTitle}
          style={{ fontSize: "clamp(28px, 4vw, 36px)", marginTop: 12 }}
        >
          Start focusing,
          <br />
          together.
        </h1>
        <p
          className={designStyles.pageSub}
          style={{ marginTop: 10, fontSize: 14 }}
        >
          Free to start. No card required. One room, one ritual.
        </p>
      </div>

      <form
        onSubmit={handleSignUp}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="First name" htmlFor="firstName">
            <DInput
              id="firstName"
              type="text"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="Ada"
            />
          </Field>
          <Field label="Last name" htmlFor="lastName">
            <DInput
              id="lastName"
              type="text"
              required
              autoComplete="family-name"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Lovelace"
            />
          </Field>
        </div>

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

        <Field label="Password" htmlFor="password">
          <DPasswordInput
            id="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 8 characters"
          />
          {password.length > 0 && (
            <PasswordStrengthMeter validation={passwordValidation} />
          )}
        </Field>

        <Field label="Repeat password" htmlFor="repeat-password">
          <DPasswordInput
            id="repeat-password"
            required
            autoComplete="new-password"
            value={repeatPassword}
            onChange={(e) => setRepeatPassword(e.target.value)}
            placeholder="Same as above"
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
          disabled={isLoading || isPasswordWeak}
        >
          {isLoading ? (
            <>Creating account…</>
          ) : (
            <>
              Sign up
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
          marginTop: 4,
        }}
      >
        Already have an account?{" "}
        <Link href="/auth/login" className={designStyles.link}>
          Log in
        </Link>
      </p>
    </div>
  );
}
