import { AuthShell } from "@/components/auth-shell";
import { NativeGoogleClient } from "./native-google-client";

export default async function NativeGooglePage({
  searchParams,
}: {
  searchParams: Promise<{ return_to?: string }>;
}) {
  const params = await searchParams;
  return (
    <AuthShell>
      <NativeGoogleClient returnToParam={params.return_to ?? null} />
    </AuthShell>
  );
}
