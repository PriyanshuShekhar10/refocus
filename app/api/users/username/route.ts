import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";

/** GET /api/users/username?q=desiredUsername — check availability */
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Username probing is cheap to script — keep it bounded.
  const rl = await checkRateLimit(userId, "search");
  if (!rl.success) return rateLimitedResponse(rl);

  const q = req.nextUrl.searchParams.get("q")?.trim().toLowerCase();
  if (!q || !/^[a-z0-9_-]{3,20}$/.test(q)) {
    return NextResponse.json({ available: false, error: "Invalid username format" });
  }

  // Case-insensitive collation matches the uniqueness semantics we want in
  // case the database still has legacy mixed-case rows.
  const db = await getDb();
  const existing = await db.collection("users").findOne(
    { username: q, _id: { $ne: new ObjectId(userId) } },
    { projection: { _id: 1 }, collation: { locale: "en", strength: 2 } },
  );

  return NextResponse.json({ available: !existing });
}
