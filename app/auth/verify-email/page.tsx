import Link from "next/link";
import { AuthShell } from "@/components/auth-shell";
import { DButton, designStyles } from "@/components/design";

type Props = {
  searchParams: Promise<{ status?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { status } = await searchParams;

  let title = "Email verification";
  let message =
    "Use the link in your welcome email to verify your address. Verification is optional — your dashboard stays available either way.";
  let cta = { label: "Go to sign in", href: "/auth/login" };

  if (status === "success") {
    title = "Email verified";
    message =
      "Your email is verified. Thanks for helping keep your Refocus account secure.";
    cta = { label: "Continue to dashboard", href: "/dashboard" };
  } else if (status === "invalid") {
    title = "Link expired or invalid";
    message =
      "This verification link doesn't work anymore. Sign in and resend a new link from your profile or settings.";
    cta = { label: "Sign in", href: "/auth/login" };
  } else if (status === "missing") {
    title = "Missing verification link";
    message = "Open the full link from your email, or request a new one after signing in.";
    cta = { label: "Sign in", href: "/auth/login" };
  }

  return (
    <AuthShell headerLink={{ label: "Sign in", href: "/auth/login" }}>
      <div style={{ textAlign: "center", maxWidth: 400, margin: "0 auto" }}>
        <h1 className={designStyles.pageTitle} style={{ fontSize: 28 }}>
          {title}
        </h1>
        <p
          className={designStyles.pageSub}
          style={{ marginTop: 12, marginBottom: 28, fontSize: 15 }}
        >
          {message}
        </p>
        <Link href={cta.href}>
          <DButton variant="primary">{cta.label}</DButton>
        </Link>
      </div>
    </AuthShell>
  );
}
