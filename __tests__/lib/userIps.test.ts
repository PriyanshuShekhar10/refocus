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

describe("recordLoginIp / recordSignupIp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersCol.updateOne.mockResolvedValue({ modifiedCount: 1 });
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
});
