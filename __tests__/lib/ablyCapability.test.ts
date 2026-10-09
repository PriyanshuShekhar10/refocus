import { describe, it, expect } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../helpers";
import { buildAblyCapability } from "@/lib/ablyCapability";
import { chatChannel } from "@/lib/realtimeChannels";

const ME = "aaaaaaaaaaaaaaaaaaaaaaaa";
const FRIEND = "bbbbbbbbbbbbbbbbbbbbbbbb";
const STRANGER = "cccccccccccccccccccccccc";
const SESSION = new ObjectId();

function setup() {
  const friendRequests = mockCollection();
  const sessions = mockCollection();
  friendRequests.find.mockReturnValue({
    toArray: async () => [{ from_user_id: FRIEND, to_user_id: ME }],
  });
  sessions.find.mockReturnValue({
    limit: () => ({ toArray: async () => [{ _id: SESSION }] }),
  });
  return { db: mockDb({ friend_requests: friendRequests, sessions }), friendRequests, sessions };
}

describe("buildAblyCapability", () => {
  it("lists only the user's own private channels, subscribe-only, with no wildcards", async () => {
    const { db } = setup();
    const cap = await buildAblyCapability(db as never, ME);

    expect(Object.keys(cap).some((k) => k.includes("*"))).toBe(false);
    expect(Object.values(cap).every((ops) => ops.length === 1 && ops[0] === "subscribe")).toBe(true);

    expect(cap[chatChannel(ME, FRIEND)]).toEqual(["subscribe"]);
    expect(cap[chatChannel(FRIEND, STRANGER)]).toBeUndefined();
    expect(cap[chatChannel(ME, STRANGER)]).toBeUndefined();

    expect(cap[`session:${SESSION}:tasks`]).toEqual(["subscribe"]);
    expect(cap[`session:${SESSION}:alerts`]).toEqual(["subscribe"]);

    expect(cap["chat:global"]).toEqual(["subscribe"]);
    expect(cap[`user:${ME}:chat`]).toEqual(["subscribe"]);
    expect(cap[`user:${FRIEND}:chat`]).toBeUndefined();
  });

  it("only queries accepted friendships and the user's own sessions", async () => {
    const { db, friendRequests, sessions } = setup();
    await buildAblyCapability(db as never, ME);
    expect(friendRequests.find).toHaveBeenCalledWith(
      expect.objectContaining({ status: "accepted", $or: [{ from_user_id: ME }, { to_user_id: ME }] }),
      expect.anything(),
    );
    expect(sessions.find).toHaveBeenCalledWith(
      expect.objectContaining({ $or: [{ owner_id: ME }, { "session_participants.user_id": ME }] }),
      expect.anything(),
    );
  });
});
