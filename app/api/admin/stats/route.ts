import { NextResponse } from "next/server";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";

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
    sessionsTotal,
    sessionsUpcoming,
    postsActive,
    postsDeleted,
    chatMessages,
    chatDeleted,
    pendingFriendRequests,
    pendingSessionRequests,
    pendingReports,
  ] = await Promise.all([
    db.collection("users").countDocuments(),
    db.collection("users").countDocuments({ createdAt: { $gte: weekAgo } }),
    db.collection("users").countDocuments({
      emailVerified: { $exists: true, $ne: null },
    }),
    db.collection("sessions").countDocuments(),
    db.collection("sessions").countDocuments({ end_time: { $gte: now } }),
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
  ]);

  return NextResponse.json({
    users: {
      total: usersTotal,
      newThisWeek: usersNewWeek,
      verified: usersVerified,
    },
    sessions: {
      total: sessionsTotal,
      upcoming: sessionsUpcoming,
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
    },
  });
}
