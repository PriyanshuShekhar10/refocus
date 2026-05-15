"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight } from "lucide-react";
import { DButton, Field, DInput, designStyles } from "@/components/design";

export function DetailsForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"div">) {
  const [firstname, setFirstname] = useState("");
  const [lastname, setLastname] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ firstname, lastname }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || "Failed to save details");
      router.push("/profile");
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
        <span className={designStyles.eyebrow}>One more thing</span>
        <h1
          className={designStyles.pageTitle}
          style={{ fontSize: "clamp(28px, 4vw, 36px)", marginTop: 12 }}
        >
          What should
          <br />
          we call you?
        </h1>
        <p
          className={designStyles.pageSub}
          style={{ marginTop: 10, fontSize: 14 }}
        >
          Just so partners can see who they&apos;re sitting with.
        </p>
      </div>

      <form
        onSubmit={handleSignUp}
        style={{ display: "flex", flexDirection: "column", gap: 16 }}
      >
        <Field label="First name" htmlFor="firstname">
          <DInput
            id="firstname"
            type="text"
            required
            autoComplete="given-name"
            value={firstname}
            onChange={(e) => setFirstname(e.target.value)}
            placeholder="Ada"
          />
        </Field>

        <Field label="Last name" htmlFor="lastname">
          <DInput
            id="lastname"
            type="text"
            required
            autoComplete="family-name"
            value={lastname}
            onChange={(e) => setLastname(e.target.value)}
            placeholder="Lovelace"
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
            <>Saving…</>
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
