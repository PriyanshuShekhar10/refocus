import type { Db } from "mongodb";
import {
  chatChannel,
  globalChatChannel,
  sessionAlertsChannel,
  sessionsChannel,
  sessionTasksChannel,
  userChannel,
  welcomeBoardChannel,
} from "@/lib/realtimeChannels";

type Ops = ("subscribe" | "publish" | "history")[];

/**
 * Ably capability for one user. Browsers only ever subscribe — all publishing
 * goes through server routes with the API key — and private channels are
 * listed explicitly (no wildcards), so a user can only listen to their own
 * friend chats and the sessions they're actually in.
 */
export async function buildAblyCapability(
  db: Db,
  userId: string,
  now = new Date(),
): Promise<Record<string, Ops>> {
  const [friendships, sessions] = await Promise.all([
    db
      .collection<{ from_user_id: string; to_user_id: string }>("friend_requests")
      .find(
        { status: "accepted", $or: [{ from_user_id: userId }, { to_user_id: userId }] },
        { projection: { from_user_id: 1, to_user_id: 1 } },
      )
      .toArray(),
    db
      .collection("sessions")
      .find(
        {
          end_time: { $gte: new Date(now.getTime() - 15 * 60 * 1000) },
          $or: [{ owner_id: userId }, { "session_participants.user_id": userId }],
        },
        { projection: { _id: 1 } },
      )
      .limit(200)
      .toArray(),
  ]);

  const subscribe: Ops = ["subscribe"];
  const capability: Record<string, Ops> = {
    [globalChatChannel()]: subscribe,
    [userChannel(userId)]: subscribe,
    [sessionsChannel()]: subscribe,
    [welcomeBoardChannel()]: subscribe,
  };
  for (const f of friendships) {
    const other = String(f.from_user_id) === userId ? String(f.to_user_id) : String(f.from_user_id);
    capability[chatChannel(userId, other)] = subscribe;
  }
  for (const s of sessions) {
    const id = String(s._id);
    capability[sessionTasksChannel(id)] = subscribe;
    capability[sessionAlertsChannel(id)] = subscribe;
  }
  return capability;
}
