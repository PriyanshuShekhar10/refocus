import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../helpers";

const watchesCol = mockCollection();
const activityCol = mockCollection();
const usersCol = mockCollection();
const db = mockDb({
  banned_ip_watches: watchesCol,
  banned_ip_activity: activityCol,
  users: usersCol,
});

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

describe("bannedIpWatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    watchesCol.updateOne.mockResolvedValue({ upsertedCount: 1 });
    watchesCol.deleteMany.mockResolvedValue({ deletedCount: 1 });
    watchesCol.createIndex.mockResolvedValue("ip_1_bannedUserId_1");
    watchesCol.find.mockReturnValue({
      project: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ bannedUserId: "abc" }]),
      }),
    });
    activityCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
  });

  it("does not log when IP is loopback", async () => {
    const { logBannedIpSignupAttempt } = await import("@/lib/bannedIpWatch");
    await logBannedIpSignupAttempt({
      ip: "127.0.0.1",
      attemptedEmail: "new@gmail.com",
      outcome: "created",
    });
    expect(activityCol.insertOne).not.toHaveBeenCalled();
  });

  it("logs signup when IP is watched", async () => {
    const { logBannedIpSignupAttempt } = await import("@/lib/bannedIpWatch");
    await logBannedIpSignupAttempt({
      ip: "203.0.113.10",
      attemptedEmail: "new@gmail.com",
      outcome: "created",
      createdUserId: "u1",
    });
    expect(activityCol.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        ip: "203.0.113.10",
        attemptedEmail: "new@gmail.com",
        outcome: "created",
        createdUserId: "u1",
      }),
    );
  });

  it("adds IP watches and clears them on unban", async () => {
    const { addBannedIpWatches, removeBannedIpWatchesForUser } = await import(
      "@/lib/bannedIpWatch"
    );
    await addBannedIpWatches({
      userId: "u1",
      email: "banned@gmail.com",
      signupIp: "203.0.113.10",
      lastLoginIp: "127.0.0.1",
      knownIps: ["198.51.100.20", "203.0.113.10"],
    });
    expect(watchesCol.updateOne).toHaveBeenCalledTimes(2);
    expect(watchesCol.updateOne).toHaveBeenCalledWith(
      { ip: "203.0.113.10", bannedUserId: "u1" },
      expect.objectContaining({
        $set: expect.objectContaining({ ip: "203.0.113.10" }),
      }),
      { upsert: true },
    );

    await removeBannedIpWatchesForUser("u1");
    expect(watchesCol.deleteMany).toHaveBeenCalledWith({ bannedUserId: "u1" });
  });
});
