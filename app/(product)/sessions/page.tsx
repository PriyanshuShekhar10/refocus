import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SessionsTabs } from "./SessionsTabs";

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
};

const PAST_SESSION_LIMIT = 100;

export default async function MySessionsPage() {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;

  if (!currentUserId) {
    redirect("/auth/login");
  }

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
          .project({ _id: 1, email: 1, name: 1, firstname: 1, lastname: 1, username: 1 })
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
      },
    ]),
  );

  const transform = (s: RawSession) => ({
    id: String(s._id),
    start: new Date(s.start_time).toISOString(),
    end: new Date(s.end_time).toISOString(),
    durationMin: s.duration_min,
    sessionType: s.session_type,
    name: s.name ?? null,
    status: s.status ?? null,
    ownerId: s.owner_id,
    isOwner: s.owner_id === currentUserId,
    participants: (s.session_participants || []).map((p) => {
      const userInfo = userMap.get(String(p.user_id));
      return {
        userId: String(p.user_id),
        email: userInfo?.email,
        name: userInfo?.name,
        firstname: userInfo?.firstname,
        lastname: userInfo?.lastname,
        username: userInfo?.username,
        quiet: p.quiet,
        attended: Boolean(p.call_joined_at),
        completed: Boolean(p.call_completed),
      };
    }),
    ownerInfo: userMap.get(String(s.owner_id)),
  });

  const upcomingSessions = upcomingRaw.map(transform);
  const pastSessions = pastRaw.map(transform);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              My Sessions
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Upcoming bookings and everything you’ve completed.
            </p>
          </div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Calendar
          </Link>
        </div>

        <SessionsTabs
          upcoming={upcomingSessions}
          past={pastSessions}
          currentUserId={currentUserId}
        />
      </div>
    </div>
  );
}
