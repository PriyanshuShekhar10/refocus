import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../helpers";

const usersCol = mockCollection();
const loginEventsCol = mockCollection();
const db = mockDb({
  users: usersCol,
  user_login_events: loginEventsCol,
});

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

describe("recordLoginIp / recordSignupIp / recordSeenIp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersCol.updateOne.mockResolvedValue({ modifiedCount: 1, matchedCount: 1 });
    usersCol.findOne.mockResolvedValue({ knownIps: [] });
    loginEventsCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
  });

  it("skips storing loopback signup IPs", async () => {
    const { recordSignupIp } = await import("@/lib/userIps");
    await recordSignupIp(String(new ObjectId()), "127.0.0.1");
    expect(usersCol.updateOne).not.toHaveBeenCalled();
  });

  it("stores a public IP and appends a login event", async () => {
    const userId = String(new ObjectId());
    const { recordLoginIp } = await import("@/lib/userIps");
    await recordLoginIp({
      userId,
      ip: "203.0.113.10",
      method: "credentials",
    });
    expect(usersCol.updateOne).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId) },
      {
        $set: expect.objectContaining({
          lastLoginIp: "203.0.113.10",
          lastLoginAt: expect.any(Date),
        }),
      },
    );
    expect(loginEventsCol.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        ip: "203.0.113.10",
        method: "credentials",
      }),
    );
  });

  it("adds a new IP to knownIps on later access", async () => {
    const userId = String(new ObjectId());
    usersCol.findOne.mockResolvedValue({
      lastSeenIp: "203.0.113.10",
      lastSeenAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      knownIps: [{ ip: "203.0.113.10" }],
    });
    const { recordSeenIp } = await import("@/lib/userIps");
    const result = await recordSeenIp({
      userId,
      ip: "198.51.100.20",
      source: "access",
    });
    expect(result.isNew).toBe(true);
    expect(usersCol.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.any(ObjectId),
        "knownIps.ip": { $ne: "198.51.100.20" },
      }),
      expect.objectContaining({
        $set: expect.objectContaining({ lastSeenIp: "198.51.100.20" }),
        $push: expect.objectContaining({
          knownIps: expect.objectContaining({
            $each: [
              expect.objectContaining({ ip: "198.51.100.20", count: 1 }),
            ],
          }),
        }),
      }),
    );
    expect(loginEventsCol.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        userId,
        ip: "198.51.100.20",
        method: "access",
      }),
    );
  });

  it("updates lastSeen on a known IP without a new access event", async () => {
    const userId = String(new ObjectId());
    usersCol.findOne.mockResolvedValue({
      lastSeenIp: "203.0.113.10",
      lastSeenAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      knownIps: [{ ip: "203.0.113.10" }],
    });
    const { recordSeenIp } = await import("@/lib/userIps");
    const result = await recordSeenIp({
      userId,
      ip: "203.0.113.10",
      source: "access",
    });
    expect(result.isNew).toBe(false);
    expect(usersCol.updateOne).toHaveBeenCalledWith(
      { _id: expect.any(ObjectId), "knownIps.ip": "203.0.113.10" },
      expect.objectContaining({
        $inc: { "knownIps.$.count": 1 },
      }),
    );
    expect(loginEventsCol.insertOne).not.toHaveBeenCalled();
  });

  it("throttles repeat access from the same IP", async () => {
    const userId = String(new ObjectId());
    usersCol.findOne.mockResolvedValue({
      lastSeenIp: "203.0.113.10",
      lastSeenAt: new Date(),
      knownIps: [{ ip: "203.0.113.10" }],
    });
    const { recordSeenIp } = await import("@/lib/userIps");
    const result = await recordSeenIp({
      userId,
      ip: "203.0.113.10",
      source: "access",
    });
    expect(result.isNew).toBe(false);
    expect(usersCol.updateOne).not.toHaveBeenCalled();
    expect(loginEventsCol.insertOne).not.toHaveBeenCalled();
  });

  it("merges legacy signup/login IPs into the known list", async () => {
    const { mergeKnownIps } = await import("@/lib/userIps");
    const ips = mergeKnownIps({
      signupIp: "203.0.113.10",
      lastLoginIp: "198.51.100.20",
      knownIps: [
        {
          ip: "198.51.100.20",
          firstSeenAt: new Date("2026-08-01"),
          lastSeenAt: new Date("2026-08-02"),
          count: 3,
        },
      ],
    });
    expect(ips.map((row) => row.ip)).toEqual(["198.51.100.20", "203.0.113.10"]);
    expect(ips[0].count).toBe(3);
  });
});
