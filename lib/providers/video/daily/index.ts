import type { VideoProvider } from "../types";
import { createDailyMeetingToken, createOrGetDailyRoom } from "./rooms";

/** Daily.co adapter: rooms rotate across the configured Daily accounts (see ./accounts). */
export const dailyVideoProvider: VideoProvider = {
  id: "daily",
  async issueJoin({ sessionId, userId, userName, roomExpiresAt, tokenExpiresAt }) {
    const { roomName, domain, account } = await createOrGetDailyRoom(sessionId, roomExpiresAt);
    const token = await createDailyMeetingToken(roomName, userId, {
      userName: userName ?? undefined,
      exp: tokenExpiresAt,
      account,
    });
    return { provider: "daily", token, roomName, domain };
  },
};
