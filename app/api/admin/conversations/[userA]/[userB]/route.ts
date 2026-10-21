import { NextRequest, NextResponse } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { requireAdmin } from "@/lib/admin";
import { logAdminAction } from "@/lib/adminAudit";
import { getConversation } from "@/lib/adminConversations";

/**
 * GET /api/admin/conversations/:userA/:userB → the private message thread
 * between two users. Every view is recorded in the admin audit log.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ userA: string; userB: string }> },
) {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { userA, userB } = await params;
  if (!ObjectId.isValid(userA) || !ObjectId.isValid(userB) || userA === userB) {
    return NextResponse.json({ error: "Invalid user ids" }, { status: 400 });
  }

  const db = await getDb();
  const conversation = await getConversation(db, userA, userB);

  await logAdminAction({
    actorId: guard.admin.userId,
    actorEmail: guard.admin.email,
    action: "messages.view_conversation",
    targetUserId: userA,
    targetUserEmail: conversation.users[0].email,
    targetLabel: [conversation.users[0], conversation.users[1]]
      .map((u) => u.name || u.username || u.email || u.id)
      .join(" ↔ "),
    resourceId: `${userA}:${userB}`,
    details: { otherUserId: userB, messageCount: conversation.messages.length },
  });

  return NextResponse.json(conversation);
}
