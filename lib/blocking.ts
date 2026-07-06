import { getDb } from "@/lib/mongodb";
import { ObjectId } from "mongodb";

type BlockDoc = {
  blocker_id: string;
  blocked_id: string;
  created_at: Date;
};

export async function areUsersBlocked(
  userA: string,
  userB: string,
): Promise<boolean> {
  if (userA === userB) return false;
  const db = await getDb();
  const block = await db.collection<BlockDoc>("user_blocks").findOne({
    $or: [
      { blocker_id: userA, blocked_id: userB },
      { blocker_id: userB, blocked_id: userA },
    ],
  });
  return !!block;
}

export async function getBlockedUserIds(userId: string): Promise<Set<string>> {
  const db = await getDb();
  const blocks = await db
    .collection<BlockDoc>("user_blocks")
    .find({
      $or: [{ blocker_id: userId }, { blocked_id: userId }],
    })
    .project({ blocker_id: 1, blocked_id: 1 })
    .toArray();

  const ids = new Set<string>();
  for (const b of blocks) {
    if (b.blocker_id === userId) ids.add(b.blocked_id);
    else if (b.blocked_id === userId) ids.add(b.blocker_id);
  }
  return ids;
}

export async function isBlockedByMe(
  blockerId: string,
  blockedId: string,
): Promise<boolean> {
  const db = await getDb();
  const block = await db.collection<BlockDoc>("user_blocks").findOne({
    blocker_id: blockerId,
    blocked_id: blockedId,
  });
  return !!block;
}

export async function blockUser(
  blockerId: string,
  blockedId: string,
): Promise<{ created: boolean }> {
  if (blockerId === blockedId) {
    throw new Error("Cannot block yourself");
  }
  if (!ObjectId.isValid(blockedId)) {
    throw new Error("Invalid user id");
  }

  const db = await getDb();
  const target = await db
    .collection("users")
    .findOne({ _id: new ObjectId(blockedId) }, { projection: { _id: 1 } });
  if (!target) {
    throw new Error("User not found");
  }

  const result = await db.collection<BlockDoc>("user_blocks").updateOne(
    { blocker_id: blockerId, blocked_id: blockedId },
    {
      $setOnInsert: {
        blocker_id: blockerId,
        blocked_id: blockedId,
        created_at: new Date(),
      },
    },
    { upsert: true },
  );

  return { created: result.upsertedCount > 0 };
}

export async function unblockUser(
  blockerId: string,
  blockedId: string,
): Promise<boolean> {
  const db = await getDb();
  const result = await db.collection<BlockDoc>("user_blocks").deleteOne({
    blocker_id: blockerId,
    blocked_id: blockedId,
  });
  return result.deletedCount > 0;
}
