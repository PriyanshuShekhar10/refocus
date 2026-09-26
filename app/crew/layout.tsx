import { getServerSession } from "next-auth";
import { notFound, redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { canViewCrewBoard } from "@/lib/crewAccess";

export default async function CrewLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    redirect("/auth/login");
  }
  if (!(await canViewCrewBoard(userId))) {
    notFound();
  }
  return children;
}
