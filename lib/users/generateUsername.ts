import type { Collection, Document } from "mongodb";

/**
 * Derive a unique username from an email local-part (e.g. kanishk@x.com → kanishk).
 */
export async function generateUsername(
  usersCol: Collection<Document>,
  email: string,
): Promise<string> {
  const baseUsername =
    email
      .split("@")[0]
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, "")
      .slice(0, 20) || "user";

  let username = baseUsername;
  for (let attempt = 0; attempt < 5; attempt++) {
    const taken = await usersCol.findOne(
      { username },
      { projection: { _id: 1 } },
    );
    if (!taken) break;
    username = `${baseUsername}${Math.floor(Math.random() * 10000)}`;
  }
  return username;
}
