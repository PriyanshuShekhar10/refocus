import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/reset-password-form";

type Props = {
  searchParams: Promise<{ token?: string }>;
};

export default async function ResetPasswordPage({ searchParams }: Props) {
  const { token } = await searchParams;

  return (
    <AuthShell headerLink={{ label: "Back to login", href: "/auth/login" }}>
      <ResetPasswordForm token={token ?? null} />
    </AuthShell>
  );
}
