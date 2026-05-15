import { SignUpForm } from "@/components/sign-up-form";
import { AuthShell } from "@/components/auth-shell";

export default function Page() {
  return (
    <AuthShell headerLink={{ label: "I have an account", href: "/auth/login" }}>
      <SignUpForm />
    </AuthShell>
  );
}
