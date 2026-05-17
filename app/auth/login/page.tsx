import { LoginForm } from "@/components/login-form";
import { AuthShell } from "@/components/auth-shell";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";

export default async function Page() {
  const session = await getServerSession(authOptions);
  if (session) {
    redirect("/dashboard");
  }

  return (
    <AuthShell headerLink={{ label: "Create account", href: "/auth/sign-up" }}>
      <LoginForm />
    </AuthShell>
  );
}
