import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import {
  mockRequest,
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
const db = mockDb({
  push_devices: pushDevicesCol,
  push_presence: pushPresenceCol,
});

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

import { POST as postDevice, DELETE as deleteDevice } from "@/app/api/push/devices/route";
import { POST as postPresence } from "@/app/api/push/presence/route";

const USER = new ObjectId().toString();
const TOKEN = "ExponentPushToken[test-token]";

describe("POST /api/push/devices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER);
    pushDevicesCol.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it("returns 401 when signed out", async () => {
    mockSession(null);
    const { status } = await parseResponse(
      await postDevice(
        mockRequest("/api/push/devices", {
          body: { token: TOKEN, platform: "ios" },
        }),
      ),
    );
    expect(status).toBe(401);
  });

  it("rejects bad platform", async () => {
    const { status, json } = await parseResponse(
      await postDevice(
        mockRequest("/api/push/devices", {
          body: { token: TOKEN, platform: "web" },
        }),
      ),
    );
    expect(status).toBe(400);
    expect(json.error).toBe("Invalid platform");
  });

  it("rejects bad token", async () => {
    const { status } = await parseResponse(
      await postDevice(
        mockRequest("/api/push/devices", {
          body: { token: "not-expo", platform: "android" },
        }),
      ),
    );
    expect(status).toBe(400);
  });

  it("upserts a device", async () => {
    const { status, json } = await parseResponse(
      await postDevice(
        mockRequest("/api/push/devices", {
          body: { token: TOKEN, platform: "android" },
        }),
      ),
    );
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(pushDevicesCol.updateOne).toHaveBeenCalled();
  });
});

describe("DELETE /api/push/devices", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER);
    pushDevicesCol.deleteOne.mockResolvedValue({ deletedCount: 1 });
  });

  it("deletes only the caller token pair", async () => {
    const { status } = await parseResponse(
      await deleteDevice(
        mockRequest("/api/push/devices", {
          method: "DELETE",
          body: { token: TOKEN },
        }),
      ),
    );
    expect(status).toBe(200);
    expect(pushDevicesCol.deleteOne).toHaveBeenCalledWith({
      userId: USER,
      token: TOKEN,
    });
  });
});

describe("POST /api/push/presence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER);
    pushPresenceCol.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it("requires inCall boolean", async () => {
    const { status } = await parseResponse(
      await postPresence(
        mockRequest("/api/push/presence", { body: { sessionId: "s1" } }),
      ),
    );
    expect(status).toBe(400);
  });

  it("stores presence", async () => {
    const { status, json } = await parseResponse(
      await postPresence(
        mockRequest("/api/push/presence", {
          body: { inCall: true, sessionId: "s1" },
        }),
      ),
    );
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(pushPresenceCol.updateOne).toHaveBeenCalled();
  });
});
