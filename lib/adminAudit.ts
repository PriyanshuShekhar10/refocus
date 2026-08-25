import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";

export type AdminAuditAction =
  | "user.ban"
  | "user.unban"
  | "user.mute"
  | "user.unmute"
  | "user.grant_admin"
  | "user.revoke_admin"
  | "post.delete"
  | "comment.delete"
  | "chat.delete"
  | "friend_message.delete"
  | "report.dismiss"
  | "report.resolve"
  | "user.email"
  | "crew.add"
  | "crew.remove"
  | "test_call.create"
  | "session.club"
  | "daily.switch_account";

export type AdminAuditEntry = {
  _id?: ObjectId;
  actorId: string;
  actorEmail: string;
  action: AdminAuditAction;
  targetUserId?: string | null;
  targetUserEmail?: string | null;
  targetLabel?: string | null;
  resourceId?: string | null;
  details?: Record<string, unknown> | null;
  createdAt: Date;
};

export async function getUserAuditLabel(
  userId: string,
): Promise<{ email: string | null; label: string | null }> {
  if (!ObjectId.isValid(userId)) {
    return { email: null, label: null };
  }
  const db = await getDb();
  const user = (await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { email: 1, username: 1, name: 1, firstname: 1, lastname: 1 } },
  )) as {
    email?: string;
    username?: string | null;
    name?: string | null;
    firstname?: string | null;
    lastname?: string | null;
  } | null;

  if (!user) return { email: null, label: null };

  const label =
    [user.firstname, user.lastname].filter(Boolean).join(" ") ||
    user.name ||
    user.username ||
    user.email ||
    null;

  return { email: user.email ?? null, label };
}

export async function logAdminAction(
  entry: Omit<AdminAuditEntry, "createdAt" | "_id">,
): Promise<void> {
  const db = await getDb();
  await db.collection("admin_audit_log").insertOne({
    ...entry,
    createdAt: new Date(),
  });
}
