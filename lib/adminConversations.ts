import { ObjectId, type Db } from "mongodb";

/**
 * Admin view of private (friend) messages: who is talking to whom, and the
 * thread between two people. Every thread view is audit-logged by the route.
 */

export type ConversationUser = {
  id: string;
  name: string | null;
  username: string | null;
  email: string | null;
};

export type ConversationSummary = {
  users: [ConversationUser, ConversationUser];
  messageCount: number;
  textCount: number;
  firstAt: string;
  lastAt: string;
  lastPreview: string | null;
};

export type ConversationMessage = {
  id: string;
  fromUserId: string;
  type: string;
  content: string | null;
  createdAt: string;
  readAt: string | null;
  deleted: boolean;
};

const PREVIEW_MAX = 120;

function displayName(u: { firstname?: string | null; lastname?: string | null; name?: string | null } | undefined) {
  if (!u) return null;
  return [u.firstname, u.lastname].filter(Boolean).join(" ").trim() || u.name?.trim() || null;
}

async function loadUsers(db: Db, ids: string[]): Promise<Map<string, ConversationUser>> {
  const objectIds = [...new Set(ids)].filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
  const rows = await db
    .collection("users")
    .find({ _id: { $in: objectIds } })
    .project({ email: 1, username: 1, name: 1, firstname: 1, lastname: 1 })
    .toArray();
  const map = new Map<string, ConversationUser>();
  for (const r of rows) {
    map.set(String(r._id), {
      id: String(r._id),
      name: displayName(r),
      username: (r.username as string) ?? null,
      email: (r.email as string) ?? null,
    });
  }
  return map;
}

function unknownUser(id: string): ConversationUser {
  return { id, name: null, username: null, email: null };
}

/** Users whose name, username or email contains `q` (case-insensitive). */
async function findUserIds(db: Db, q: string): Promise<string[]> {
  const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(escaped, "i");
  const rows = await db
    .collection("users")
    .find({ $or: [{ email: re }, { username: re }, { name: re }, { firstname: re }, { lastname: re }] })
    .project({ _id: 1 })
    .limit(200)
    .toArray();
  return rows.map((r) => String(r._id));
}

export async function listConversations(
  db: Db,
  opts: { q?: string; limit?: number } = {},
): Promise<ConversationSummary[]> {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 300);
  const match: Record<string, unknown> = {};
  const q = opts.q?.trim();
  if (q) {
    const ids = await findUserIds(db, q);
    if (ids.length === 0) return [];
    match.$or = [{ from_user_id: { $in: ids } }, { to_user_id: { $in: ids } }];
  }

  const rows = await db
    .collection("messages")
    .aggregate<{
      _id: { a: string; b: string };
      messageCount: number;
      textCount: number;
      firstAt: Date;
      lastAt: Date;
      lastText: { content?: string; deleted?: boolean } | null;
    }>([
      { $match: match },
      { $sort: { created_at: 1 } },
      {
        $group: {
          _id: {
            a: { $cond: [{ $lt: ["$from_user_id", "$to_user_id"] }, "$from_user_id", "$to_user_id"] },
            b: { $cond: [{ $lt: ["$from_user_id", "$to_user_id"] }, "$to_user_id", "$from_user_id"] },
          },
          messageCount: { $sum: 1 },
          textCount: { $sum: { $cond: [{ $eq: ["$type", "text"] }, 1, 0] } },
          firstAt: { $first: "$created_at" },
          lastAt: { $last: "$created_at" },
          lastText: {
            $last: { $cond: [{ $eq: ["$type", "text"] }, { content: "$content", deleted: "$deleted" }, "$$REMOVE"] },
          },
        },
      },
      { $sort: { lastAt: -1 } },
      { $limit: limit },
    ])
    .toArray();

  const users = await loadUsers(db, rows.flatMap((r) => [String(r._id.a), String(r._id.b)]));
  return rows.map((r) => {
    const a = String(r._id.a);
    const b = String(r._id.b);
    const preview = r.lastText?.deleted ? "(deleted message)" : r.lastText?.content ?? null;
    return {
      users: [users.get(a) ?? unknownUser(a), users.get(b) ?? unknownUser(b)],
      messageCount: r.messageCount,
      textCount: r.textCount,
      firstAt: new Date(r.firstAt).toISOString(),
      lastAt: new Date(r.lastAt).toISOString(),
      lastPreview: preview ? preview.slice(0, PREVIEW_MAX) : null,
    };
  });
}

export async function getConversation(
  db: Db,
  userA: string,
  userB: string,
): Promise<{ users: [ConversationUser, ConversationUser]; messages: ConversationMessage[] }> {
  const rows = await db
    .collection("messages")
    .find({
      $or: [
        { from_user_id: userA, to_user_id: userB },
        { from_user_id: userB, to_user_id: userA },
      ],
    })
    .sort({ created_at: 1 })
    .limit(2000)
    .toArray();

  const users = await loadUsers(db, [userA, userB]);
  return {
    users: [users.get(userA) ?? unknownUser(userA), users.get(userB) ?? unknownUser(userB)],
    messages: rows.map((m) => ({
      id: String(m._id),
      fromUserId: String(m.from_user_id),
      type: String(m.type ?? "text"),
      content: typeof m.content === "string" ? m.content : null,
      createdAt: new Date(m.created_at as Date).toISOString(),
      readAt: m.read_at ? new Date(m.read_at as Date).toISOString() : null,
      deleted: m.deleted === true,
    })),
  };
}
