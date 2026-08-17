import { getDb } from "@/lib/mongodb";
import { canonicalEmail } from "@/lib/normalizeEmail";

export async function isEmailBanned(email: string): Promise<boolean> {
  const canonical = canonicalEmail(email);
  if (!canonical.includes("@")) return false;
  const db = await getDb();
  const row = await db.collection("banned_emails").findOne(
    { canonicalEmail: canonical },
    { projection: { _id: 1 } },
  );
  return !!row;
}

export async function banEmail(params: {
  email: string | null | undefined;
  userId: string;
  bannedBy: string;
}): Promise<void> {
  if (!params.email) return;
  const originalEmail = params.email.trim().toLowerCase();
  const canonical = canonicalEmail(originalEmail);
  if (!canonical.includes("@")) return;

  const db = await getDb();
  await db.collection("banned_emails").updateOne(
    { canonicalEmail: canonical },
    {
      $set: {
        canonicalEmail: canonical,
        originalEmail,
        userId: params.userId,
        bannedAt: new Date(),
        bannedBy: params.bannedBy,
      },
    },
    { upsert: true },
  );
  await db
    .collection("banned_emails")
    .createIndex({ canonicalEmail: 1 }, { unique: true })
    .catch(() => undefined);
}

export async function unbanEmail(email: string | null | undefined): Promise<void> {
  if (!email) return;
  const db = await getDb();
  await db.collection("banned_emails").deleteOne({
    canonicalEmail: canonicalEmail(email),
  });
}

export async function findUserByEmailIdentity(email: string) {
  const display = email.trim().toLowerCase();
  const canonical = canonicalEmail(display);
  const db = await getDb();
  return db.collection("users").findOne({
    $or: [
      { email: display },
      { email: canonical },
      { canonicalEmail: display },
      { canonicalEmail: canonical },
    ],
  });
}
