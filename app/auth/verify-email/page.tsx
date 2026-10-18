import { AuthShell } from "@/components/auth-shell";
import { VerifyEmailStatus } from "@/components/verify-email-status";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function VerifyEmailPage({ searchParams }: Props) {
  const { token } = await searchParams;

  return (
    <AuthShell headerLink={{ label: "Sign in", href: "/auth/login" }}>
      <div style={{ textAlign: "center", maxWidth: 400, margin: "0 auto" }}>
        <VerifyEmailStatus token={token ?? null} />
      </div>
    </AuthShell>
  );
}
