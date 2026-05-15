import { LoginForm } from "@/components/login-form";
import { AuthShell } from "@/components/auth-shell";

export default function Page() {
  return (
    <AuthShell headerLink={{ label: "Create account", href: "/auth/sign-up" }}>
      <LoginForm />
    </AuthShell>
  );
}
