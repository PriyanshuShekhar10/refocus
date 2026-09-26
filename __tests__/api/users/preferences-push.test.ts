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

const usersCol = mockCollection();
const db = mockDb({ users: usersCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

import { GET, PATCH } from "@/app/api/users/preferences/route";

const USER = new ObjectId().toString();

describe("preferences push fields", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER);
    usersCol.findOne.mockResolvedValue({
      _id: new ObjectId(USER),
      preferences: {},
    });
    usersCol.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it("defaults push flags to true", async () => {
    const { status, json } = await parseResponse(await GET());
    expect(status).toBe(200);
    expect(json.preferences.pushSessionReminders).toBe(true);
    expect(json.preferences.pushFriendRequests).toBe(true);
    expect(json.preferences.pushChatMessages).toBe(true);
  });

  it("patches pushChatMessages", async () => {
    const { status, json } = await parseResponse(
      await PATCH(
        mockRequest("/api/users/preferences", {
          method: "PATCH",
          body: { pushChatMessages: false },
        }),
      ),
    );
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(usersCol.updateOne).toHaveBeenCalled();
    const updateArg = usersCol.updateOne.mock.calls[0]?.[1] as {
      $set: Record<string, unknown>;
    };
    expect(updateArg.$set["preferences.pushChatMessages"]).toBe(false);
  });
});
