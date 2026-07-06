import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { fetchAvatarUrlMap } from "@/lib/userAvatar";
import { isEmailVerified } from "@/lib/emailVerification";
import { ObjectId } from "mongodb";

export async function GET(req: NextRequest) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { searchParams } = new URL(req.url);
  const includeDeleted = searchParams.get("includeDeleted") === "true";
  const limit = Math.min(parseInt(searchParams.get("limit") || "50", 10), 100);

  const db = await getDb();
  const filter: Record<string, unknown> = {};
  if (!includeDeleted) {
    filter.deleted = { $ne: true };
  }

  const docs = await db
    .collection("global_messages")
    .find(filter)
    .sort({ created_at: -1 })
    .limit(limit)
    .toArray();

  const avatarByUserId = await fetchAvatarUrlMap(
    db,
    docs.map((m) => String(m.user_id)),
  );

  const userIds = [...new Set(docs.map((m) => String(m.user_id)))].filter(
    (id) => ObjectId.isValid(id),
  );

  const users =
    userIds.length > 0
      ? await db
          .collection("users")
          .find({ _id: { $in: userIds.map((id) => new ObjectId(id)) } })
          .project({ email: 1, username: 1, emailVerified: 1 })
          .toArray()
      : [];

  const usersById = Object.fromEntries(
    users.map((u) => [String(u._id), u]),
  );

  return NextResponse.json({
    messages: docs.map((m) => {
      const uid = String(m.user_id);
      const u = usersById[uid];
      return {
        id: String(m._id),
        user_id: uid,
        user_name: m.user_name ?? null,
        username: m.username ?? u?.username ?? null,
        user_email: u?.email ?? null,
        emailVerified: isEmailVerified(u?.emailVerified),
        avatar_url: avatarByUserId[uid] ?? null,
        content: m.content as string,
        created_at: (m.created_at as Date).toISOString(),
        deleted: Boolean(m.deleted),
      };
    }),
  });
}
