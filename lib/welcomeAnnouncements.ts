import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { resolveAvatarUrl } from "@/lib/userAvatar";
import { publishAbly } from "@/lib/ably-server";
import { welcomeBoardChannel } from "@/lib/realtimeChannels";

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
}): Promise<WelcomeAnnouncement | null> {
  if (!ObjectId.isValid(params.userId)) return null;

  const db = await getDb();
  const userId = new ObjectId(params.userId);
  const displayName =
    params.displayName?.trim() ||
    params.username?.trim() ||
    "someone";
  const createdAt = params.createdAt ?? new Date();

  try {
    const result = await db.collection("welcome_announcements").insertOne({
      userId,
      username: params.username?.trim() || null,
      displayName,
      avatarUrl: params.avatarUrl ?? null,
      createdAt,
    });

    const announcement: WelcomeAnnouncement = {
      id: String(result.insertedId),
      userId: String(userId),
      username: params.username?.trim() || null,
      displayName,
      avatarUrl: params.avatarUrl ?? null,
      createdAt: createdAt.toISOString(),
    };

    await publishAbly(welcomeBoardChannel(), {
      type: "welcome_announcement",
      announcement,
    });

    return announcement;
  } catch (err) {
    // Unique index on userId — ignore duplicates from retries.
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code: number }).code === 11000
    ) {
      return null;
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
    if (err && typeof err === "object" && "writeErrors" in err) {
      return;
    }
    throw err;
  }
}

/**
 * Catch users who signed up when announcement create was dropped (serverless
 * fire-and-forget). Safe to call on every list — only inserts missing rows.
 */
export async function syncMissingWelcomeAnnouncements(
  lookbackDays = 14,
  limit = 30,
): Promise<void> {
  const db = await getDb();
  const since = new Date(Date.now() - lookbackDays * 24 * 60 * 60 * 1000);

  const recentUsers = (await db
    .collection("users")
    .find(
      { createdAt: { $gte: since } },
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
    .sort({ createdAt: -1 })
    .limit(limit)
    .toArray()) as UserSeed[];

  if (recentUsers.length === 0) return;

  const ids = recentUsers.map((u) => u._id);
  const existing = await db
    .collection("welcome_announcements")
    .find({ userId: { $in: ids } }, { projection: { userId: 1 } })
    .toArray();
  const have = new Set(existing.map((d) => String(d.userId)));

  const missing = recentUsers.filter((u) => !have.has(String(u._id)));
  if (missing.length === 0) return;

  try {
    await db.collection("welcome_announcements").insertMany(
      missing.map((u) => ({
        userId: u._id,
        username: u.username?.trim() || null,
        displayName: displayNameFor(u),
        avatarUrl: resolveAvatarUrl({
          avatar_url: u.avatar_url,
          image: u.image,
        }),
        createdAt: u.createdAt instanceof Date ? u.createdAt : new Date(),
      })),
      { ordered: false },
    );
  } catch (err) {
    if (
      err instanceof Error &&
      "code" in err &&
      (err as { code: number }).code === 11000
    ) {
      return;
    }
    if (err && typeof err === "object" && "writeErrors" in err) {
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
  // Only sync gaps on the first page — keeps pagination cheap.
  if (!params.cursor) {
    await syncMissingWelcomeAnnouncements().catch((err) => {
      console.error("[welcome] syncMissing failed:", err);
    });
  }

  await db
    .collection("welcome_announcements")
    .createIndex({ userId: 1 }, { unique: true })
    .catch(() => undefined);
  await db
    .collection("welcome_announcements")
    .createIndex({ createdAt: -1, _id: -1 })
    .catch(() => undefined);

  const query: Record<string, unknown> = {};
  if (params.cursor) {
    // cursor format: `${createdAtISO}_${id}`
    const [createdAtIso, id] = params.cursor.split("_");
    if (createdAtIso && id && ObjectId.isValid(id)) {
      const createdAt = new Date(createdAtIso);
      if (!Number.isNaN(createdAt.getTime())) {
        query.$or = [
          { createdAt: { $lt: createdAt } },
          { createdAt, _id: { $lt: new ObjectId(id) } },
        ];
      }
    } else if (ObjectId.isValid(params.cursor)) {
      // Back-compat with old ObjectId-only cursors
      query._id = { $lt: new ObjectId(params.cursor) };
    }
  }

  const docs = (await db
    .collection("welcome_announcements")
    .find(query)
    .sort({ createdAt: -1, _id: -1 })
    .limit(limit + 1)
    .toArray()) as WelcomeDoc[];

  const hasMore = docs.length > limit;
  const page = hasMore ? docs.slice(0, limit) : docs;
  const last = page[page.length - 1];
  const nextCursor =
    hasMore && last
      ? `${mapDoc(last).createdAt}_${String(last._id)}`
      : null;

  return {
    announcements: page.map(mapDoc),
    nextCursor,
  };
}
