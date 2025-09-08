import { DetailsForm } from "@/components/details-form";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
export default async function Page() {
  console.log("rendered details page");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  console.log(data);
  if (error || !data?.claims) {
    console.log(error);
    // redirect("/auth/login");
  }
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <DetailsForm />
      </div>
    </div>
  );
}
