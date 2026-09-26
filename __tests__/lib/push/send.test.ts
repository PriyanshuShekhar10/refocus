import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../../helpers";

const pushDevicesCol = mockCollection();
const pushPresenceCol = mockCollection();
const pushDeliveriesCol = mockCollection();
const usersCol = mockCollection();

const db = mockDb({
  push_devices: pushDevicesCol,
  push_presence: pushPresenceCol,
  push_deliveries: pushDeliveriesCol,
  users: usersCol,
});

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

const fetchMock = vi.fn();
vi.stubGlobal("fetch", fetchMock);

import { sendExpoPushToTokens, notifyUser } from "@/lib/push/send";
import { markPushDelivery } from "@/lib/push/dedupe";
import { setPushPresence, isUserInCall, PRESENCE_TTL_MS } from "@/lib/push/presence";
import {
  notifyChatMessagePush,
  notifyFriendRequestPush,
  notifySessionRequestPush,
} from "@/lib/push/notify";

const USER_A = new ObjectId().toString();
const USER_B = new ObjectId().toString();
const TOKEN = "ExponentPushToken[abc123]";

describe("sendExpoPushToTokens", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: "ok" }] }),
    });
  });

  it("posts Expo body with channel and collapse id", async () => {
    const result = await sendExpoPushToTokens([TOKEN], {
      title: "Maya",
      body: "hello",
      channel: "messages",
      collapseId: `chat:${USER_A}`,
      data: { type: "chat_message", friendId: USER_A },
    });

    expect(result.sent).toBe(1);
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body[0].to).toBe(TOKEN);
    expect(body[0].channelId).toBe("messages");
    expect(body[0].collapseId).toBe(`chat:${USER_A}`);
    expect(body[0].data.type).toBe("chat_message");
  });

  it("deletes DeviceNotRegistered tokens", async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        data: [{ status: "error", details: { error: "DeviceNotRegistered" } }],
      }),
    });
    pushDevicesCol.deleteOne.mockResolvedValue({ deletedCount: 1 });

    const result = await sendExpoPushToTokens([TOKEN], {
      title: "t",
      body: "b",
      channel: "messages",
      data: { type: "chat_message", friendId: USER_A },
    });

    expect(result.failed).toBe(1);
    expect(pushDevicesCol.deleteOne).toHaveBeenCalledWith({ token: TOKEN });
  });

  it("swallows network errors", async () => {
    fetchMock.mockRejectedValue(new Error("offline"));
    const result = await sendExpoPushToTokens([TOKEN], {
      title: "t",
      body: "b",
      channel: "sessions",
      data: { type: "session_reminder", sessionId: "1" },
    });
    expect(result.reason).toBe("network_error");
    expect(result.sent).toBe(0);
  });
});

describe("presence quiet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("treats fresh inCall as in call", async () => {
    pushPresenceCol.findOne.mockResolvedValue({
      userId: USER_A,
      inCall: true,
      sessionId: "s1",
      updatedAt: new Date(),
    });
    expect(await isUserInCall(USER_A)).toBe(true);
  });

  it("ignores presence older than TTL", async () => {
    pushPresenceCol.findOne.mockResolvedValue({
      userId: USER_A,
      inCall: true,
      sessionId: "s1",
      updatedAt: new Date(Date.now() - PRESENCE_TTL_MS - 1000),
    });
    expect(await isUserInCall(USER_A)).toBe(false);
  });

  it("setPushPresence upserts", async () => {
    await setPushPresence({ userId: USER_A, inCall: true, sessionId: "s1" });
    expect(pushPresenceCol.updateOne).toHaveBeenCalled();
  });
});

describe("notifyUser in-call quiet", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushDevicesCol.find.mockReturnValue({
      project: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ token: TOKEN }]),
      }),
    });
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: "ok" }] }),
    });
  });

  it("skips chat while in call", async () => {
    pushPresenceCol.findOne.mockResolvedValue({
      userId: USER_A,
      inCall: true,
      sessionId: "s1",
      updatedAt: new Date(),
    });

    const result = await notifyUser({
      userId: USER_A,
      message: {
        title: "Maya",
        body: "hi",
        channel: "messages",
        data: { type: "chat_message", friendId: USER_B },
      },
    });
    expect(result.skipped).toBe(true);
    expect(result.reason).toBe("in_call");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still sends session reminders while in call", async () => {
    pushPresenceCol.findOne.mockResolvedValue({
      userId: USER_A,
      inCall: true,
      sessionId: "s1",
      updatedAt: new Date(),
    });

    const result = await notifyUser({
      userId: USER_A,
      message: {
        title: "Focus",
        body: "soon",
        channel: "sessions",
        data: { type: "session_reminder", sessionId: "s1" },
      },
    });
    expect(result.skipped).toBe(false);
    expect(fetchMock).toHaveBeenCalled();
  });
});

describe("markPushDelivery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns true on insert", async () => {
    pushDeliveriesCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    expect(
      await markPushDelivery({
        userId: USER_A,
        kind: "session_reminder",
        dedupeKey: "s1",
      }),
    ).toBe(true);
  });

  it("returns false on duplicate key", async () => {
    pushDeliveriesCol.insertOne.mockRejectedValue({ code: 11000 });
    expect(
      await markPushDelivery({
        userId: USER_A,
        kind: "session_reminder",
        dedupeKey: "s1",
      }),
    ).toBe(false);
  });
});

describe("notify helpers prefer flags", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pushDeliveriesCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    pushDevicesCol.find.mockReturnValue({
      project: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ token: TOKEN }]),
      }),
    });
    pushPresenceCol.findOne.mockResolvedValue(null);
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ data: [{ status: "ok" }] }),
    });
  });

  it("skips chat when pushChatMessages is false", async () => {
    usersCol.findOne.mockImplementation(async (query: { _id: ObjectId }) => {
      const id = String(query._id);
      if (id === USER_A) {
        return {
          _id: new ObjectId(USER_A),
          preferences: { pushChatMessages: false },
        };
      }
      return { _id: new ObjectId(USER_B), firstname: "Maya", lastname: "Chen" };
    });

    const result = await notifyChatMessagePush({
      toUserId: USER_A,
      fromUserId: USER_B,
      content: "hello there",
      messageId: "m1",
    });
    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("sends chat with collapse id", async () => {
    usersCol.findOne.mockImplementation(async (query: { _id: ObjectId }) => {
      const id = String(query._id);
      if (id === USER_A) {
        return { _id: new ObjectId(USER_A), preferences: {} };
      }
      return { _id: new ObjectId(USER_B), firstname: "Maya", lastname: "Chen" };
    });

    const result = await notifyChatMessagePush({
      toUserId: USER_A,
      fromUserId: USER_B,
      content: "hello there",
      messageId: "m1",
    });
    expect(result?.sent).toBe(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body[0].collapseId).toBe(`chat:${USER_B}`);
    expect(body[0].title).toBe("Maya C.");
  });

  it("skips friend request when opted out", async () => {
    usersCol.findOne.mockImplementation(async (query: { _id: ObjectId }) => {
      const id = String(query._id);
      if (id === USER_A) {
        return {
          _id: new ObjectId(USER_A),
          preferences: { pushFriendRequests: false },
        };
      }
      return { _id: new ObjectId(USER_B), name: "Maya" };
    });

    expect(
      await notifyFriendRequestPush({
        toUserId: USER_A,
        fromUserId: USER_B,
        requestKey: "k",
      }),
    ).toBeNull();
  });

  it("sends session request to recipient", async () => {
    usersCol.findOne.mockImplementation(async (query: { _id: ObjectId }) => {
      const id = String(query._id);
      if (id === USER_A) {
        return { _id: new ObjectId(USER_A), preferences: {} };
      }
      return { _id: new ObjectId(USER_B), firstname: "Maya" };
    });

    const result = await notifySessionRequestPush({
      toUserId: USER_A,
      fromUserId: USER_B,
      start: new Date("2026-05-26T10:00:00.000Z"),
      durationMin: 50,
      requestId: "req1",
    });
    expect(result?.sent).toBe(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(String(init.body));
    expect(body[0].data.type).toBe("session_request");
    expect(body[0].channelId).toBe("sessions");
  });
});
