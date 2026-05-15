"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";
import { validatePassword } from "@/lib/validatePassword";
import { PasswordStrengthMeter } from "./PasswordStrengthMeter";
import {
  DButton,
  Field,
  DPasswordInput,
  designStyles,
} from "@/components/design";

export function UpdatePasswordForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [password, setPassword] = useState("");
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

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Implement server-side password update via reset token.
      router.push("/profile");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

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
          Set a new password.
        </h1>
        <p
          className={designStyles.pageSub}
          style={{ marginTop: 10, fontSize: 14 }}
        >
          Pick something only you would type. We&apos;ll keep it quiet.
        </p>
      </div>

      <form
        onSubmit={handleUpdatePassword}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <Field label="New password" htmlFor="password">
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
            <>Saving…</>
          ) : (
            <>
              Save new password
              <ArrowRight size={16} className={designStyles.arrow} />
            </>
          )}
        </DButton>
      </form>
    </div>
  );
}
