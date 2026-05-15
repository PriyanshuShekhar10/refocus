import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { AuthShell } from "@/components/auth-shell";
import { designStyles } from "@/components/design";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell headerLink={{ label: "Back to login", href: "/auth/login" }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
        <div className={designStyles.avatar} aria-hidden="true">
          <AlertTriangle size={28} />
        </div>
        <div>
          <h1
            className={designStyles.pageTitle}
            style={{ fontSize: "clamp(24px, 4vw, 32px)" }}
          >
            Something went sideways.
          </h1>
          <p
            className={designStyles.pageSub}
            style={{ marginTop: 10, fontSize: 14 }}
          >
            {params?.error
              ? `An error occurred: ${params.error}`
              : "An unspecified error occurred. Try again, or head back to login."}
          </p>
        </div>
        <Link
          href="/auth/login"
          className={`${designStyles.btn} ${designStyles.btnPrimary} ${designStyles.btnLg}`}
        >
          Back to login
        </Link>
      </div>
    </AuthShell>
  );
}
