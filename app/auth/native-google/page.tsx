import { AuthShell } from "@/components/auth-shell";
import { NativeGoogleClient } from "./native-google-client";

export default function NativeGooglePage() {
  return (
    <AuthShell>
      <NativeGoogleClient />
    </AuthShell>
  );
}
