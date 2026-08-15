import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { resolveAvatarUrl } from "@/lib/userAvatar";

export type WelcomeAnnouncement = {
  id: string;
  userId: string;
  username: string | null;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
};

type WelcomeDoc = {
  _id: ObjectId;
  userId: ObjectId;
  username?: string | null;
  displayName: string;
  avatarUrl?: string | null;
  createdAt: Date;
};

type UserSeed = {
  _id: ObjectId;
  username?: string | null;
  name?: string | null;
  firstname?: string | null;
  email?: string | null;
  avatar_url?: string | null;
  image?: string | null;
  createdAt?: Date;
};

function displayNameFor(user: {
  name?: string | null;
  firstname?: string | null;
  username?: string | null;
  email?: string | null;
}): string {
  const name = user.name?.trim() || user.firstname?.trim();
  if (name) return name;
  if (user.username?.trim()) return user.username.trim();
  const emailLocal = user.email?.split("@")[0]?.trim();
  return emailLocal || "someone";
}

function mapDoc(doc: WelcomeDoc): WelcomeAnnouncement {
  return {
    id: String(doc._id),
    userId: String(doc.userId),
    username: doc.username ?? null,
    displayName: doc.displayName,
    avatarUrl: doc.avatarUrl ?? null,
    createdAt:
      doc.createdAt instanceof Date
        ? doc.createdAt.toISOString()
        : new Date(doc.createdAt).toISOString(),
  };
}

/** Post a Discord-style welcome announcement for a newly created user. */
export async function createWelcomeAnnouncement(params: {
  userId: string;
  username?: string | null;
  displayName?: string | null;
  avatarUrl?: string | null;
  createdAt?: Date;
}): Promise<void> {
  if (!ObjectId.isValid(params.userId)) return;

  const db = await getDb();
  const userId = new ObjectId(params.userId);
  const displayName =
    params.displayName?.trim() ||
    params.username?.trim() ||
    "someone";

  try {
    await db.collection("welcome_announcements").insertOne({
      userId,
      username: params.username?.trim() || null,
      displayName,
      avatarUrl: params.avatarUrl ?? null,
      createdAt: params.createdAt ?? new Date(),
    });
  } catch (err) {
    // Unique index on userId — ignore duplicates from retries.
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code: number }).code === 11000
    ) {
      return;
    }
    throw err;
  }
}

/**
 * If the welcome board is empty (first deploy), seed from recent users so
 * the channel isn't blank.
 */
export async function backfillWelcomeAnnouncementsIfEmpty(
  limit = 40,
): Promise<void> {
  const db = await getDb();
  const col = db.collection("welcome_announcements");
  const existing = await col.estimatedDocumentCount();
  if (existing > 0) return;

  const users = (await db
    .collection("users")
    .find(
      {},
      {
        projection: {
          username: 1,
          name: 1,
          firstname: 1,
          email: 1,
          avatar_url: 1,
          image: 1,
          createdAt: 1,
        },
      },
    )
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit)
    .toArray()) as UserSeed[];

  if (users.length === 0) return;

  const docs = users.map((u) => ({
    userId: u._id,
    username: u.username?.trim() || null,
    displayName: displayNameFor(u),
    avatarUrl: resolveAvatarUrl({
      avatar_url: u.avatar_url,
      image: u.image,
    }),
    createdAt: u.createdAt instanceof Date ? u.createdAt : new Date(),
  }));

  try {
    await col.insertMany(docs, { ordered: false });
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code: number }).code === 11000
    ) {
      return;
    }
    // BulkWriteError with partial success is fine for backfill.
    if (
      err &&
      typeof err === "object" &&
      "writeErrors" in err
    ) {
      return;
    }
    throw err;
  }
}

export async function listWelcomeAnnouncements(params: {
  limit?: number;
  cursor?: string | null;
}): Promise<{ announcements: WelcomeAnnouncement[]; nextCursor: string | null }> {
  const limit = Math.min(Math.max(params.limit ?? 30, 1), 50);
  const db = await getDb();

  await backfillWelcomeAnnouncementsIfEmpty();

  // Ensure one welcome per user for future inserts.
  await db
    .collection("welcome_announcements")
    .createIndex({ userId: 1 }, { unique: true })
    .catch(() => undefined);

  const query: Record<string, unknown> = {};
  if (params.cursor && ObjectId.isValid(params.cursor)) {
    query._id = { $lt: new ObjectId(params.cursor) };
  }

  const docs = (await db
    .collection("welcome_announcements")
    .find(query)
    .sort({ _id: -1 })
    .limit(limit + 1)
    .toArray()) as WelcomeDoc[];

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  const nextCursor = hasMore ? String(page[page.length - 1]._id) : null;

  return {
    announcements: page.map(mapDoc),
    nextCursor,
  };
}
