import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import { isEmailVerified } from "@/lib/emailVerification";

export async function fetchEmailVerifiedMap(
  db: Db,
  userIds: string[],
): Promise<Record<string, boolean>> {
  const ids = [...new Set(userIds)].filter((id) => ObjectId.isValid(id));
  if (ids.length === 0) return {};

  const users = await db
    .collection("users")
    .find(
      { _id: { $in: ids.map((id) => new ObjectId(id)) } },
      { projection: { emailVerified: 1 } },
    )
    .toArray();

  return Object.fromEntries(
    users.map((u) => [String(u._id), isEmailVerified(u.emailVerified)]),
  );
}
