import { DetailsForm } from "@/components/details-form";
import { AuthShell } from "@/components/auth-shell";

export default function Page() {
  return (
    <AuthShell>
      <DetailsForm />
    </AuthShell>
  );
}
