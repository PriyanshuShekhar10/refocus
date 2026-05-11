import { getDb } from "@/lib/mongodb";

export async function areFriends(
  userA: string,
  userB: string,
): Promise<boolean> {
  const db = await getDb();
  const request = await db.collection("friend_requests").findOne({
    $or: [
      { from_user_id: userA, to_user_id: userB, status: "accepted" },
      { from_user_id: userB, to_user_id: userA, status: "accepted" },
    ],
  });
  return !!request;
}
