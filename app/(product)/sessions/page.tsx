import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { loadMySessions } from "@/lib/mySessions";
import { MySessionsView } from "./MySessionsView";

export default async function MySessionsPage() {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;

  if (!currentUserId) {
    redirect("/auth/login");
  }

  const { upcoming, past } = await loadMySessions(currentUserId);

  return (
    <div className="rf-app rf-dots min-h-screen text-[14px]">
      <div className="mx-auto max-w-[980px] px-[clamp(16px,3vw,40px)] pb-24 pt-8">
        <MySessionsView upcoming={upcoming} past={past} currentUserId={currentUserId} />
      </div>
    </div>
  );
}
