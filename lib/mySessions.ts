import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { resolveAvatarUrl } from "@/lib/userAvatar";
import { resolveSessionDisplayName } from "@/lib/sessionPersonalization";
import type { PastSession } from "@/app/(product)/sessions/PastSessionsList";

type RawSession = {
  _id: ObjectId;
  owner_id: string;
  start_time: Date;
  end_time: Date;
  duration_min: number;
  session_type: string;
  name?: string | null;
  status?: string;
  session_participants?: Array<{
    user_id: string;
    joined_at: Date | string;
    quiet?: boolean;
    label?: string | null;
    call_joined_at?: Date | string;
    call_completed?: boolean;
  }>;
};

type UserDoc = {
  _id: ObjectId;
  email?: string | null;
  name?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  image?: string | null;
};

const PAST_SESSION_LIMIT = 100;

/**
 * Upcoming + past sessions for the signed-in user, hydrated with participant
 * profiles. Shared by the /sessions page and GET /api/sessions/mine.
 */
export async function loadMySessions(
  currentUserId: string,
): Promise<{ upcoming: PastSession[]; past: PastSession[] }> {
  const db = await getDb();
  const now = new Date();

  // Run upcoming and past queries in parallel — they hit the same collection
  // but the index plan and result sets are independent.
  const [upcomingRaw, pastRaw] = await Promise.all([
    db
      .collection<RawSession>("sessions")
      .find({
        end_time: { $gte: now },
        $or: [
          { owner_id: currentUserId },
          { "session_participants.user_id": currentUserId },
        ],
      })
      .sort({ start_time: 1 })
      .limit(50)
      .toArray(),
    db
      .collection<RawSession>("sessions")
      .find({
        end_time: { $lt: now },
        // Only sessions the user was actually booked into count as "past
        // attended" — listing sessions the user merely owned (and never
        // had a participant added to) would be misleading. The owner is
        // always pushed into session_participants at create time, so this
        // also covers solo sessions.
        "session_participants.user_id": currentUserId,
      })
      .sort({ start_time: -1 })
      .limit(PAST_SESSION_LIMIT)
      .toArray(),
  ]);

  // Hydrate participant/owner profile info in a single users query.
  const userIds = new Set<string>();
  for (const list of [upcomingRaw, pastRaw]) {
    list.forEach((s) => {
      if (s.owner_id) userIds.add(String(s.owner_id));
      (s.session_participants || []).forEach((p) => {
        if (p.user_id) userIds.add(String(p.user_id));
      });
    });
  }

  const objectIds = Array.from(userIds)
    .filter((id) => ObjectId.isValid(id))
    .map((id) => new ObjectId(id));

  const users =
    objectIds.length > 0
      ? ((await db
          .collection<UserDoc>("users")
          .find({ _id: { $in: objectIds } })
          .project({
            _id: 1,
            email: 1,
            name: 1,
            firstname: 1,
            lastname: 1,
            username: 1,
            avatar_url: 1,
            image: 1,
          })
          .toArray()) as unknown as UserDoc[])
      : [];

  const userMap = new Map(
    users.map((u) => [
      String(u._id),
      {
        email: u.email ?? undefined,
        name: u.name ?? undefined,
        firstname: u.firstname ?? undefined,
        lastname: u.lastname ?? undefined,
        username: u.username ?? undefined,
        avatarUrl: resolveAvatarUrl(u),
      },
    ]),
  );

  const transform = (s: RawSession) => ({
    id: String(s._id),
    start: new Date(s.start_time).toISOString(),
    end: new Date(s.end_time).toISOString(),
    durationMin: s.duration_min,
    sessionType: s.session_type,
    name: resolveSessionDisplayName(
      {
        name: s.name ?? null,
        owner_id: s.owner_id,
        session_participants: s.session_participants,
      },
      currentUserId,
    ),
    status: s.status ?? null,
    ownerId: s.owner_id,
    isOwner: s.owner_id === currentUserId,
    participants: (s.session_participants || []).map((p) => {
      const userInfo = userMap.get(String(p.user_id));
      return {
        userId: String(p.user_id),
        // Only the viewer's own email — partners see name and @username.
        email: String(p.user_id) === currentUserId ? userInfo?.email : undefined,
        name: userInfo?.name,
        firstname: userInfo?.firstname,
        lastname: userInfo?.lastname,
        username: userInfo?.username,
        avatarUrl: userInfo?.avatarUrl ?? null,
        quiet: p.quiet,
        attended: Boolean(p.call_joined_at),
        completed: Boolean(p.call_completed),
      };
    }),
    ownerInfo: (() => {
      const info = userMap.get(String(s.owner_id));
      if (!info) return undefined;
      return String(s.owner_id) === currentUserId ? info : { ...info, email: undefined };
    })(),
  });

  return {
    upcoming: upcomingRaw.map(transform),
    past: pastRaw.map(transform),
  };
}
