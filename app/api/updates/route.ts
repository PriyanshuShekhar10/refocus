import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { isUserAdmin } from "@/lib/admin";
import { listProductUpdatesForUser } from "@/lib/productUpdates";

export async function GET() {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const isAdmin = await isUserAdmin(userId);
  const db = await getDb();
  const updates = await listProductUpdatesForUser(db, userId, { isAdmin });
  return NextResponse.json({ updates, isAdmin });
}
