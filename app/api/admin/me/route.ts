import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { countAdmins, isUserAdmin } from "@/lib/admin";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  const email = session?.user?.email ?? null;
  // The jwt callback in lib/auth.ts resolves this once per token; only fall
  // back to a DB round trip when that hasn't happened yet (e.g. a very old
  // token, or the lookup failed last time).
  const cachedIsAdmin = (session?.user as { isAdmin?: boolean } | undefined)?.isAdmin;
  const isAdmin = cachedIsAdmin ?? (await isUserAdmin(userId));

  return NextResponse.json({
    isAdmin,
    userId: isAdmin ? userId : null,
    email: isAdmin ? email : null,
    adminCount: isAdmin ? await countAdmins() : undefined,
  });
}
