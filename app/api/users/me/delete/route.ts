import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { ObjectId } from "mongodb";
import bcrypt from "bcryptjs";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";

/**
 * POST /api/users/me/delete
 * Body: { confirmText: "DELETE", currentPassword?: string }
 *
 * Permanently removes the authenticated user's account along with personal
 * artifacts that reference them directly (friendships, friend requests,
 * session requests, global-chat presence). Sessions and chat messages are
 * left in place but anonymized.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rl = await checkRateLimit(userId, "auth");
  if (!rl.success) return rateLimitedResponse(rl);

  const body = await req.json().catch(() => ({}));
  const { confirmText, currentPassword } = body as {
    confirmText?: string;
    currentPassword?: string;
  };

  if (confirmText !== "DELETE") {
    return NextResponse.json(
      { error: "Type DELETE to confirm" },
      { status: 400 }
    );
  }

  const db = await getDb();
  const _id = new ObjectId(userId);
  const user = await db
    .collection<{ _id: ObjectId; hashedPassword?: string }>("users")
    .findOne({ _id });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // If the account has a password, require it. Accounts created purely via an
  // OAuth flow (no hashedPassword) can proceed with just confirmText.
  if (user.hashedPassword) {
    if (!currentPassword) {
      return NextResponse.json(
        { error: "Password required" },
        { status: 400 }
      );
    }
    const ok = await bcrypt.compare(currentPassword, user.hashedPassword);
    if (!ok) {
      return NextResponse.json(
        { error: "Incorrect password" },
        { status: 401 }
      );
    }
  }

  // Best-effort cleanup of user-owned artifacts. Run in parallel; failure of
  // any one collection should not block deletion.
  await Promise.allSettled([
    db.collection("users").deleteOne({ _id }),
    db.collection("friendships").deleteMany({
      $or: [{ userA: _id }, { userB: _id }],
    }),
    db.collection("friendRequests").deleteMany({
      $or: [{ from: _id }, { to: _id }],
    }),
    db.collection("sessionRequests").deleteMany({
      $or: [{ from: _id }, { to: _id }],
    }),
    db.collection("globalChatPresence").deleteMany({ userId: _id }),
    db.collection("accounts").deleteMany({ userId: _id }),
    db.collection("sessions").updateMany(
      { hostId: _id },
      { $set: { hostId: null, hostDeleted: true } }
    ),
  ]);

  return NextResponse.json({ ok: true });
}
