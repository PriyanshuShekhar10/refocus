import Link from "next/link";
import { MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { designStyles } from "@/components/design";

export default function Page() {
  return (
    <AuthShell headerLink={{ label: "Back to login", href: "/auth/login" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className={designStyles.avatar} aria-hidden="true">
          <MailCheck size={28} />
        </div>
        <div>
          <h1
            className={designStyles.pageTitle}
            style={{ fontSize: "clamp(24px, 4vw, 32px)" }}
          >
            Welcome to Refocus.
          </h1>
          <p
            className={designStyles.pageSub}
            style={{ marginTop: 10, fontSize: 14 }}
          >
            You&apos;ve successfully signed up. Check your email to confirm your
            account before signing in.
          </p>
        </div>
        <Link
          href="/auth/login"
          className={`${designStyles.btn} ${designStyles.btnPrimary} ${designStyles.btnLg}`}
        >
          Go to login
        </Link>
      </div>
    </AuthShell>
  );
}
