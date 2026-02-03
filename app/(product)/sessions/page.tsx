import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getDb } from "@/lib/mongodb";
import { redirect } from "next/navigation";
import Link from "next/link";
import { SessionsList } from "./SessionsList";

export default async function MySessionsPage() {
  const session = await getServerSession(authOptions);
  const currentUserId = (session?.user as { id?: string } | undefined)?.id;
  
  if (!currentUserId) {
    redirect("/auth/login");
  }

  const db = await getDb();
  const now = new Date();

  // Fetch upcoming sessions where user is owner or participant
  const sessions = await db
    .collection("sessions")
    .find({
      end_time: { $gte: now },
      $or: [
        { owner_id: currentUserId },
        { "session_participants.user_id": currentUserId },
      ],
    })
    .sort({ start_time: 1 })
    .limit(50)
    .toArray();

  // Get all unique user IDs for participant info
  const userIds = new Set<string>();
  sessions.forEach((s) => {
    if (s.owner_id) userIds.add(s.owner_id);
    (s.session_participants || []).forEach((p: { user_id: string }) => {
      if (p.user_id) userIds.add(p.user_id);
    });
  });

  // Fetch user details
  const users = await db
    .collection("users")
    .find({ _id: { $in: Array.from(userIds).map((id) => {
      try {
        const { ObjectId } = require("mongodb");
        return new ObjectId(id);
      } catch {
        return id;
      }
    }) } })
    .project({ _id: 1, email: 1, name: 1, firstname: 1, lastname: 1 })
    .toArray();

  const userMap = new Map(
    users.map((u) => [
      u._id.toString(),
      {
        email: u.email,
        name: u.name,
        firstname: u.firstname,
        lastname: u.lastname,
      },
    ])
  );

  // Transform sessions for client
  const transformedSessions = sessions.map((s) => ({
    id: s._id.toString(),
    start: s.start_time.toISOString(),
    end: s.end_time.toISOString(),
    durationMin: s.duration_min,
    sessionType: s.session_type,
    name: s.name || null,
    status: s.status,
    ownerId: s.owner_id,
    isOwner: s.owner_id === currentUserId,
    participants: (s.session_participants || []).map((p: { user_id: string; quiet?: boolean }) => {
      const userInfo = userMap.get(p.user_id);
      return {
        userId: p.user_id,
        email: userInfo?.email,
        name: userInfo?.name,
        firstname: userInfo?.firstname,
        lastname: userInfo?.lastname,
        quiet: p.quiet,
      };
    }),
    ownerInfo: userMap.get(s.owner_id),
  }));

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
              Your upcoming focus sessions
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

        {/* Sessions List */}
        <SessionsList 
          sessions={transformedSessions} 
          currentUserId={currentUserId} 
        />
      </div>
    </div>
  );
}
