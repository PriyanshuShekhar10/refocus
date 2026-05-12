import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

/** GET /api/users/username?q=desiredUsername — check availability */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  if (!q || !/^[a-z0-9_-]{3,20}$/.test(q)) {
    return NextResponse.json({ available: false, error: "Invalid username format" });
  }

  const db = await getDb();
  const existing = await db.collection("users").findOne(
    { username: q, _id: { $ne: new ObjectId(userId) } },
    { projection: { _id: 1 } }
  );

  return NextResponse.json({ available: !existing });
}
