import { DetailsForm } from "@/components/details-form";
export default async function Page() {
  console.log("rendered details page");
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <DetailsForm />
      </div>
    </div>
  );
}
