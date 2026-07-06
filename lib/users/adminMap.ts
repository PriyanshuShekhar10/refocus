import type { Db } from "mongodb";
import { ObjectId } from "mongodb";
import { ADMIN_ROLE } from "@/lib/admin";

export async function fetchAdminMap(
  db: Db,
  userIds: string[],
): Promise<Record<string, boolean>> {
  const ids = [...new Set(userIds)].filter((id) => ObjectId.isValid(id));
  if (ids.length === 0) return {};

  const users = await db
    .collection("users")
    .find(
      { _id: { $in: ids.map((id) => new ObjectId(id)) }, role: ADMIN_ROLE },
      { projection: { _id: 1 } },
    )
    .toArray();

  const map: Record<string, boolean> = {};
  for (const id of ids) {
    map[id] = false;
  }
  for (const u of users) {
    map[String(u._id)] = true;
  }
  return map;
}
