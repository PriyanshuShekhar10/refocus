import { Db, ObjectId } from "mongodb";
import { getBlockedUserIds } from "@/lib/blocking";
import {
  escapeRegex,
  parseMentionLabels,
  userDisplayName,
} from "@/lib/communityMentions";

type UserLookup = {
  _id: ObjectId;
  username?: string | null;
  firstname?: string | null;
  lastname?: string | null;
  name?: string | null;
};

function mentionLookupKey(label: string): string {
  return label.trim().toLowerCase();
}

function buildNameQueries(label: string): Record<string, unknown>[] {
  const trimmed = label.trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  const queries: Record<string, unknown>[] = [
    { username: trimmed.toLowerCase() },
    { name: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" } },
  ];

  if (parts.length === 1) {
    queries.push({
      firstname: { $regex: `^${escapeRegex(parts[0])}$`, $options: "i" },
    });
  } else {
    const first = parts[0];
    const last = parts.slice(1).join(" ");
    queries.push({
      firstname: { $regex: `^${escapeRegex(first)}$`, $options: "i" },
      lastname: { $regex: `^${escapeRegex(last)}$`, $options: "i" },
    });
  }

  return queries;
}

async function resolveMentionLabel(
  db: Db,
  label: string,
): Promise<string | null> {
  const users = (await db
    .collection("users")
    .find({ $or: buildNameQueries(label) })
    .project({ _id: 1, username: 1, firstname: 1, lastname: 1, name: 1 })
    .limit(5)
    .toArray()) as UserLookup[];

  if (users.length === 0) return null;

  const key = mentionLookupKey(label);
  const exact = users.find(
    (user) =>
      user.username?.toLowerCase() === key ||
      mentionLookupKey(userDisplayName(user)) === key,
  );
  return String((exact ?? users[0])._id);
}

export async function resolveMentionedUserIds(
  db: Db,
  authorId: string,
  content: string,
): Promise<string[]> {
  const labels = parseMentionLabels(content);
  if (labels.length === 0) return [];

  const blocked = await getBlockedUserIds(authorId);
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const label of labels) {
    const id = await resolveMentionLabel(db, label);
    if (!id || id === authorId || blocked.has(id) || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }

  return ids;
}

export async function collectThreadMentionedUserIds(
  db: Db,
  postId: string,
  excludeCommentId?: string,
): Promise<string[]> {
  if (!ObjectId.isValid(postId)) return [];

  const post = await db.collection("community_posts").findOne(
    { _id: new ObjectId(postId), deletedAt: { $exists: false } },
    { projection: { mentionedUserIds: 1 } },
  );
  if (!post) return [];

  const comments = await db
    .collection("community_comments")
    .find(
      {
        postId: new ObjectId(postId),
        deletedAt: { $exists: false },
        ...(excludeCommentId && ObjectId.isValid(excludeCommentId)
          ? { _id: { $ne: new ObjectId(excludeCommentId) } }
          : {}),
      },
      { projection: { mentionedUserIds: 1 } },
    )
    .toArray();

  const ids = new Set<string>();
  for (const raw of (post.mentionedUserIds as ObjectId[] | undefined) ?? []) {
    ids.add(String(raw));
  }
  for (const comment of comments) {
    for (const raw of (comment.mentionedUserIds as ObjectId[] | undefined) ??
      []) {
      ids.add(String(raw));
    }
  }
  return [...ids];
}

export function toObjectIdList(ids: string[]): ObjectId[] {
  return ids.filter((id) => ObjectId.isValid(id)).map((id) => new ObjectId(id));
}

export { userDisplayName };
