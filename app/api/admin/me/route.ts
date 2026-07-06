import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { countAdmins, isUserAdmin } from "@/lib/admin";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const email = session?.user?.email ?? null;
  const isAdmin = await isUserAdmin(userId);

  return NextResponse.json({
    isAdmin,
    userId: isAdmin ? userId : null,
    email: isAdmin ? email : null,
    adminCount: isAdmin ? await countAdmins() : undefined,
  });
}
