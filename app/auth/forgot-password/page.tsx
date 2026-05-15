import { ForgotPasswordForm } from "@/components/forgot-password-form";
import { AuthShell } from "@/components/auth-shell";

export default function Page() {
  return (
    <AuthShell headerLink={{ label: "Back to login", href: "/auth/login" }}>
      <ForgotPasswordForm />
    </AuthShell>
  );
}
