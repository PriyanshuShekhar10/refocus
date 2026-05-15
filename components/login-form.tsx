"use client";

import { signIn } from "next-auth/react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { DButton, Field, DInput, DPasswordInput, designStyles } from "@/components/design";

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await signIn("credentials", {
        redirect: false,
        email,
        password,
      });
      if (res?.error) {
        if (res.error === "CredentialsSignin") {
          setError("Invalid credentials. Please check your email and password.");
        } else if (res.error.includes("No user found")) {
          setError("No account found with this email. Please sign up.");
        } else {
          setError(res.error);
        }
      } else {
        router.push("/dashboard");
      }
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className={className}
      style={{ display: "flex", flexDirection: "column", gap: 24 }}
      {...props}
    >
      <div>
        <span className={designStyles.eyebrow}>Welcome back</span>
        <h1
          className={designStyles.pageTitle}
          style={{ fontSize: "clamp(28px, 4vw, 36px)", marginTop: 12 }}
        >
          Sign in to Refocus.
        </h1>
        <p
          className={designStyles.pageSub}
          style={{ marginTop: 10, fontSize: 14 }}
        >
          Pick up where you left off — a quiet room is one click away.
        </p>
      </div>

      <form
        onSubmit={handleLogin}
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

        <Field
          label="Password"
          htmlFor="password"
          trailing={
            <Link
              href="/auth/forgot-password"
              className={designStyles.linkMute}
              style={{ fontSize: 12 }}
            >
              Forgot?
            </Link>
          }
        >
          <DPasswordInput
            id="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
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
            <>Signing in…</>
          ) : (
            <>
              Continue
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
          marginTop: 8,
        }}
      >
        Don&apos;t have an account?{" "}
        <Link href="/auth/sign-up" className={designStyles.link}>
          Sign up
        </Link>
      </p>
    </div>
  );
}
