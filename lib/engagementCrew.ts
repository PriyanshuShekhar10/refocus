import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongodb";
import { canonicalEmail } from "@/lib/normalizeEmail";
import { findUserByEmailIdentity } from "@/lib/bannedEmails";

export type EngagementCrewMember = {
  _id?: ObjectId;
  canonicalEmail: string;
  email: string;
  userId: string | null;
  name: string | null;
  addedAt: Date;
  addedBy: string;
};

function displayName(user: {
  firstname?: string | null;
  lastname?: string | null;
  name?: string | null;
  username?: string | null;
  email?: string | null;
} | null): string | null {
  if (!user) return null;
  return (
    [user.firstname, user.lastname].filter(Boolean).join(" ") ||
    user.name ||
    user.username ||
    user.email ||
    null
  );
}

async function ensureCrewIndexes(): Promise<void> {
  const db = await getDb();
  await db
    .collection("engagement_crew")
    .createIndex({ canonicalEmail: 1 }, { unique: true })
    .catch(() => undefined);
}

export async function listEngagementCrew(): Promise<
  Array<{
    email: string;
    canonicalEmail: string;
    userId: string | null;
    name: string | null;
    addedAt: string;
  }>
> {
  const db = await getDb();
  const rows = (await db
    .collection<EngagementCrewMember>("engagement_crew")
    .find({})
    .sort({ addedAt: 1 })
    .toArray()) as EngagementCrewMember[];

  return rows.map((r) => ({
    email: r.email,
    canonicalEmail: r.canonicalEmail,
    userId: r.userId,
    name: r.name,
    addedAt: r.addedAt.toISOString(),
  }));
}

/** Re-resolve userId/name for roster rows (in case they registered after add). */
export async function resolveEngagementCrewMembers(): Promise<
  Array<{
    email: string;
    canonicalEmail: string;
    userId: string | null;
    name: string | null;
  }>
> {
  const db = await getDb();
  const rows = (await db
    .collection<EngagementCrewMember>("engagement_crew")
    .find({})
    .sort({ addedAt: 1 })
    .toArray()) as EngagementCrewMember[];

  const out: Array<{
    email: string;
    canonicalEmail: string;
    userId: string | null;
    name: string | null;
  }> = [];

  for (const row of rows) {
    let userId = row.userId;
    let name = row.name;
    if (!userId) {
      const user = (await findUserByEmailIdentity(row.email)) as {
        _id: ObjectId;
        firstname?: string | null;
        lastname?: string | null;
        name?: string | null;
        username?: string | null;
        email?: string | null;
      } | null;
      if (user) {
        userId = String(user._id);
        name = displayName(user);
        await db.collection("engagement_crew").updateOne(
          { canonicalEmail: row.canonicalEmail },
          { $set: { userId, name } },
        );
      }
    } else if (ObjectId.isValid(userId)) {
      const user = (await db.collection("users").findOne(
        { _id: new ObjectId(userId) },
        {
          projection: {
            firstname: 1,
            lastname: 1,
            name: 1,
            username: 1,
            email: 1,
          },
        },
      )) as {
        firstname?: string | null;
        lastname?: string | null;
        name?: string | null;
        username?: string | null;
        email?: string | null;
      } | null;
      name = displayName(user) ?? name;
    }
    out.push({
      email: row.email,
      canonicalEmail: row.canonicalEmail,
      userId,
      name,
    });
  }

  return out;
}

export async function addEngagementCrewMember(params: {
  email: string;
  addedBy: string;
}): Promise<
  | { ok: true; member: Awaited<ReturnType<typeof listEngagementCrew>>[number] }
  | { ok: false; error: string; status: number }
> {
  const raw = params.email.trim().toLowerCase();
  const canonical = canonicalEmail(raw);
  if (!canonical.includes("@")) {
    return { ok: false, error: "Invalid email", status: 400 };
  }

  await ensureCrewIndexes();
  const db = await getDb();
  const existing = await db.collection("engagement_crew").findOne({
    canonicalEmail: canonical,
  });
  if (existing) {
    return { ok: false, error: "Already on crew", status: 409 };
  }

  const user = (await findUserByEmailIdentity(raw)) as {
    _id: ObjectId;
    email?: string | null;
    firstname?: string | null;
    lastname?: string | null;
    name?: string | null;
    username?: string | null;
  } | null;

  const doc: EngagementCrewMember = {
    canonicalEmail: canonical,
    email: raw,
    userId: user ? String(user._id) : null,
    name: displayName(user),
    addedAt: new Date(),
    addedBy: params.addedBy,
  };

  await db.collection("engagement_crew").insertOne(doc);

  return {
    ok: true,
    member: {
      email: doc.email,
      canonicalEmail: doc.canonicalEmail,
      userId: doc.userId,
      name: doc.name,
      addedAt: doc.addedAt.toISOString(),
    },
  };
}

/**
 * TEMPORARY product rule helper: whether this user is on the engagement crew
 * roster (by stored userId, or by resolving their account email).
 */
export async function isEngagementCrewUserId(
  userId: string | null | undefined,
): Promise<boolean> {
  if (!userId || !ObjectId.isValid(userId)) return false;
  const db = await getDb();
  const byUserId = await db.collection("engagement_crew").findOne(
    { userId },
    { projection: { _id: 1 } },
  );
  if (byUserId) return true;

  const user = (await db.collection("users").findOne(
    { _id: new ObjectId(userId) },
    { projection: { email: 1 } },
  )) as { email?: string | null } | null;
  const email = user?.email?.trim();
  if (!email) return false;

  const byEmail = await db.collection("engagement_crew").findOne(
    { canonicalEmail: canonicalEmail(email.toLowerCase()) },
    { projection: { _id: 1 } },
  );
  return Boolean(byEmail);
}

export async function removeEngagementCrewMember(
  email: string,
): Promise<{ ok: true } | { ok: false; error: string; status: number }> {
  const canonical = canonicalEmail(email.trim().toLowerCase());
  if (!canonical.includes("@")) {
    return { ok: false, error: "Invalid email", status: 400 };
  }
  const db = await getDb();
  const result = await db.collection("engagement_crew").deleteOne({
    canonicalEmail: canonical,
  });
  if (result.deletedCount === 0) {
    return { ok: false, error: "Not found", status: 404 };
  }
  return { ok: true };
}
