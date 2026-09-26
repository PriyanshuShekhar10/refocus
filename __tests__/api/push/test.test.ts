import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import {
  parseResponse,
  mockCollection,
  mockDb,
  mockSession,
} from "../../helpers";

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: vi.fn().mockResolvedValue({
    success: true,
    limit: 30,
    remaining: 29,
    reset: Date.now() + 60000,
  }),
  rateLimitedResponse: vi.fn().mockReturnValue(
    new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 }),
  ),
}));

const pushDevicesCol = mockCollection();
const pushPresenceCol = mockCollection();
const usersCol = mockCollection();
const db = mockDb({
  push_devices: pushDevicesCol,
  push_presence: pushPresenceCol,
  users: usersCol,
});

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

const notifyUser = vi.fn();
vi.mock("@/lib/push/send", () => ({
  notifyUser: (...args: unknown[]) => notifyUser(...args),
}));

import { GET, POST } from "@/app/api/push/test/route";

const USER = new ObjectId().toString();
const TOKEN = "ExponentPushToken[test-token]";

describe("/api/push/test", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER);
    pushDevicesCol.find.mockReturnValue({
      project: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([{ token: TOKEN }]),
      }),
    });
    pushPresenceCol.findOne.mockResolvedValue(null);
    usersCol.findOne.mockResolvedValue({
      _id: new ObjectId(USER),
      preferences: {},
    });
    notifyUser.mockResolvedValue({
      attempted: 1,
      sent: 1,
      failed: 0,
      skipped: false,
    });
  });

  it("GET returns 401 when signed out", async () => {
    mockSession(null);
    const { status } = await parseResponse(await GET());
    expect(status).toBe(401);
  });

  it("GET reports device diagnostics", async () => {
    const { status, json } = await parseResponse(await GET());
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.deviceCount).toBe(1);
    expect(json.hasDevices).toBe(true);
    expect(json.preferences.pushChatMessages).toBe(true);
  });

  it("POST sends a test push", async () => {
    const { status, json } = await parseResponse(await POST());
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.result.sent).toBe(1);
    expect(notifyUser).toHaveBeenCalledOnce();
  });

  it("POST returns 400 when no devices", async () => {
    pushDevicesCol.find.mockReturnValue({
      project: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
    });
    const { status, json } = await parseResponse(await POST());
    expect(status).toBe(400);
    expect(json.ok).toBe(false);
    expect(notifyUser).not.toHaveBeenCalled();
  });
});
