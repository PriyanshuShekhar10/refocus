import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { areFriends } from "@/lib/friendship";
import { isBlockedByMe } from "@/lib/blocking";
import { resolveAvatarUrl } from "@/lib/userAvatar";
import { SESSION_REPORT_MAX_AGE_DAYS } from "@/lib/reportConstants";

type ParticipantDoc = {
  user_id: string;
};

type SessionDoc = {
  _id: ObjectId;
  end_time: Date;
  session_participants?: ParticipantDoc[];
};

type PartnerEntry = {
  userId: string;
  lastSessionId: string;
  lastSessionAt: string;
};

// GET /api/users/me/recent-partners?limit=5
export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const limitParam = parseInt(searchParams.get("limit") || "5", 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(limitParam, 1), 20)
    : 5;

  const db = await getDb();
  const now = new Date();

  const sessions = (await db
    .collection<SessionDoc>("sessions")
    .find({
      end_time: { $lt: now },
      "session_participants.user_id": userId,
    })
    .project({
      end_time: 1,
      session_participants: 1,
    })
    .sort({ end_time: -1 })
    .limit(50)
    .toArray()) as unknown as SessionDoc[];

  const partnerMap = new Map<string, PartnerEntry>();

  for (const s of sessions) {
    const participants = s.session_participants ?? [];
    if (participants.length < 2) continue;

    const partnerId = participants.find(
      (p) => String(p.user_id) !== String(userId),
    )?.user_id;
    if (!partnerId || !ObjectId.isValid(String(partnerId))) continue;

    const pid = String(partnerId);
    if (partnerMap.has(pid)) continue;

    partnerMap.set(pid, {
      userId: pid,
      lastSessionId: String(s._id),
      lastSessionAt: new Date(s.end_time).toISOString(),
    });

    if (partnerMap.size >= limit) break;
  }

  const partnerIds = Array.from(partnerMap.keys());
  if (partnerIds.length === 0) {
    return NextResponse.json({ partners: [] });
  }

  const users = await db
    .collection("users")
    .find({ _id: { $in: partnerIds.map((id) => new ObjectId(id)) } })
    .project({
      name: 1,
      firstname: 1,
      lastname: 1,
      username: 1,
      avatar_url: 1,
      image: 1,
    })
    .toArray();

  const userById: Record<
    string,
    {
      name: string | null;
      username: string | null;
      avatarUrl: string | null;
    }
  > = {};
  for (const u of users) {
    const id = String(u._id);
    const name =
      [u.firstname, u.lastname].filter(Boolean).join(" ") ||
      (u.name as string | null) ||
      null;
    userById[id] = {
      name,
      username: (u.username as string | null) ?? null,
      avatarUrl: resolveAvatarUrl(
        u as { avatar_url?: string | null; image?: string | null },
      ),
    };
  }

  const pendingRequests = await db
    .collection("friend_requests")
    .find({
      status: "pending",
      $or: [
        { from_user_id: userId, to_user_id: { $in: partnerIds } },
        { from_user_id: { $in: partnerIds }, to_user_id: userId },
      ],
    })
    .project({ from_user_id: 1, to_user_id: 1 })
    .toArray();

  const pendingByPartner: Record<
    string,
    "outgoing" | "incoming"
  > = {};
  for (const r of pendingRequests) {
    const from = String(r.from_user_id);
    const to = String(r.to_user_id);
    if (from === userId) pendingByPartner[to] = "outgoing";
    else if (to === userId) pendingByPartner[from] = "incoming";
  }

  const reportMaxAgeMs = SESSION_REPORT_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

  // Batch fetch accepted friends to avoid N+1 query
  const acceptedRequests = await db.collection("friend_requests").find({
    status: "accepted",
    $or: [
      { from_user_id: userId, to_user_id: { $in: partnerIds } },
      { from_user_id: { $in: partnerIds }, to_user_id: userId },
    ],
  }).toArray();
  const friendSet = new Set<string>();
  for (const f of acceptedRequests) {
    if (String(f.from_user_id) === userId) friendSet.add(String(f.to_user_id));
    if (String(f.to_user_id) === userId) friendSet.add(String(f.from_user_id));
  }

  // Batch fetch blocked users to avoid N+1 query
  const blocks = await db.collection("user_blocks").find({
    blocker_id: userId,
    blocked_id: { $in: partnerIds },
  }).project({ blocked_id: 1 }).toArray();
  const blockedSet = new Set<string>(blocks.map(b => String(b.blocked_id)));

  const partners = partnerIds.map((pid) => {
    const entry = partnerMap.get(pid)!;
    const profile = userById[pid];
    const sessionEnd = new Date(entry.lastSessionAt).getTime();
    const reportable = now.getTime() - sessionEnd <= reportMaxAgeMs;

    return {
      userId: pid,
      name: profile?.name ?? null,
      username: profile?.username ?? null,
      avatarUrl: profile?.avatarUrl ?? null,
      lastSessionId: entry.lastSessionId,
      lastSessionAt: entry.lastSessionAt,
      isFriend: friendSet.has(pid),
      friendRequestPending: pendingByPartner[pid] ?? "none",
      isBlockedByMe: blockedSet.has(pid),
      reportable,
    };
  });

  return NextResponse.json({ partners });
}
