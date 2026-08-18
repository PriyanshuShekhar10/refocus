import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { DELETED_USERS_COLLECTION } from "@/lib/deletedUsers";

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const db = await getDb();
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const [
    usersTotal,
    usersNewWeek,
    usersVerified,
    usersDeleted,
    sessionsTotal,
    sessionsUpcoming,
    sessionsDone,
    sessionsMatchedDone,
    sessionsFullyCompleted,
    sessionsPartiallyCompleted,
    postsActive,
    postsDeleted,
    chatMessages,
    chatDeleted,
    pendingFriendRequests,
    pendingSessionRequests,
    pendingReports,
    bannedIpActivityWeek,
  ] = await Promise.all([
    db.collection("users").countDocuments(),
    db.collection("users").countDocuments({ createdAt: { $gte: weekAgo } }),
    db.collection("users").countDocuments({
      emailVerified: { $exists: true, $ne: null },
    }),
    db.collection(DELETED_USERS_COLLECTION).countDocuments(),
    db.collection("sessions").countDocuments(),
    db.collection("sessions").countDocuments({ end_time: { $gte: now } }),
    db.collection("sessions").countDocuments({ end_time: { $lt: now } }),
    db.collection("sessions").countDocuments({
      end_time: { $lt: now },
      $or: [
        { participant_count: { $gte: 2 } },
        { "session_participants.1": { $exists: true } },
      ],
    }),
    db.collection("sessions").countDocuments({
      end_time: { $lt: now },
      $expr: {
        $gte: [
          {
            $size: {
              $filter: {
                input: { $ifNull: ["$session_participants", []] },
                as: "p",
                cond: { $eq: ["$$p.call_completed", true] },
              },
            },
          },
          2,
        ],
      },
    }),
    db.collection("sessions").countDocuments({
      end_time: { $lt: now },
      $expr: {
        $gte: [
          {
            $size: {
              $filter: {
                input: { $ifNull: ["$session_participants", []] },
                as: "p",
                cond: { $eq: ["$$p.call_completed", true] },
              },
            },
          },
          1,
        ],
      },
    }),
    db.collection("community_posts").countDocuments({
      deletedAt: { $exists: false },
    }),
    db.collection("community_posts").countDocuments({
      deletedAt: { $exists: true },
    }),
    db.collection("global_messages").countDocuments({ deleted: { $ne: true } }),
    db.collection("global_messages").countDocuments({ deleted: true }),
    db.collection("friend_requests").countDocuments({ status: "pending" }),
    db.collection("session_requests").countDocuments({ status: "pending" }),
    db.collection("content_reports").countDocuments({ status: "pending" }),
    db.collection("banned_ip_activity").countDocuments({
      createdAt: { $gte: weekAgo },
    }),
  ]);

  return NextResponse.json({
    users: {
      total: usersTotal,
      newThisWeek: usersNewWeek,
      verified: usersVerified,
      deleted: usersDeleted,
    },
    sessions: {
      total: sessionsTotal,
      upcoming: sessionsUpcoming,
      done: sessionsDone,
      matchedDone: sessionsMatchedDone,
      fullyCompleted: sessionsFullyCompleted,
      partiallyCompleted: sessionsPartiallyCompleted,
      completionRate:
        sessionsMatchedDone > 0
          ? sessionsFullyCompleted / sessionsMatchedDone
          : 0,
    },
    community: {
      postsActive,
      postsDeleted,
    },
    globalChat: {
      messagesActive: chatMessages,
      messagesDeleted: chatDeleted,
    },
    moderation: {
      pendingFriendRequests,
      pendingSessionRequests,
      pendingReports,
      bannedIpActivityWeek,
    },
  });
}
