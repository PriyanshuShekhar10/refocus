import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../helpers";

const settingsCol = mockCollection();
const sessionsCol = mockCollection();
const db = mockDb({
  app_settings: settingsCol,
  sessions: sessionsCol,
});

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

function stubTwoAccounts() {
  vi.stubEnv("DAILY_API_KEY", "key-one");
  vi.stubEnv("DAILY_DOMAIN", "a.daily.co");
  vi.stubEnv("DAILY_API_KEY_2", "key-two");
  vi.stubEnv("DAILY_DOMAIN_2", "b.daily.co");
}

function jsonResponse(status: number, body: unknown = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function textResponse(status: number, body = "") {
  return new Response(body, { status });
}

describe("pickDailyAccountForNewRoom", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("cycles through accounts in rotate mode", async () => {
    stubTwoAccounts();
    settingsCol.findOne.mockResolvedValue({
      _id: "daily",
      selectionMode: "rotate",
      rotationCounter: 0,
    });
    settingsCol.findOneAndUpdate.mockResolvedValue({
      _id: "daily",
      rotationCounter: 1,
    });

    const { pickDailyAccountForNewRoom } = await import(
      "@/lib/dailyAccounts"
    );
    const first = await pickDailyAccountForNewRoom();
    expect(first.id).toBe("1");

    settingsCol.findOneAndUpdate.mockResolvedValue({
      _id: "daily",
      rotationCounter: 2,
    });
    const second = await pickDailyAccountForNewRoom();
    expect(second.id).toBe("2");

    settingsCol.findOneAndUpdate.mockResolvedValue({
      _id: "daily",
      rotationCounter: 3,
    });
    const third = await pickDailyAccountForNewRoom();
    expect(third.id).toBe("1");
  });

  it("uses the pinned account when mode is pin", async () => {
    stubTwoAccounts();
    settingsCol.findOne.mockResolvedValue({
      _id: "daily",
      selectionMode: "pin",
      activeId: "2",
    });

    const { pickDailyAccountForNewRoom } = await import(
      "@/lib/dailyAccounts"
    );
    const account = await pickDailyAccountForNewRoom();
    expect(account.id).toBe("2");
    expect(settingsCol.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("throws when rotationCounter is missing after increment", async () => {
    stubTwoAccounts();
    settingsCol.findOne.mockResolvedValue({
      _id: "daily",
      selectionMode: "rotate",
    });
    settingsCol.findOneAndUpdate.mockResolvedValue({
      _id: "daily",
      // rotationCounter absent
    });

    const { pickDailyAccountForNewRoom } = await import(
      "@/lib/dailyAccounts"
    );
    await expect(pickDailyAccountForNewRoom()).rejects.toThrow(
      /rotation counter missing/i,
    );
  });
});

describe("createOrGetDailyRoom fail-safes", () => {
  const sessionId = new ObjectId().toHexString();
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    stubTwoAccounts();
    vi.clearAllMocks();
    sessionsCol.findOne.mockResolvedValue(null);
    sessionsCol.updateOne.mockResolvedValue({
      matchedCount: 1,
      modifiedCount: 1,
    });
    settingsCol.findOne.mockResolvedValue({
      _id: "daily",
      selectionMode: "rotate",
    });
    settingsCol.findOneAndUpdate.mockResolvedValue({
      _id: "daily",
      rotationCounter: 1,
    });
    fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("claims one account when two first joins race", async () => {
    // Probe both accounts → 404 miss, then pick account 1, claim wins.
    fetchMock
      .mockResolvedValueOnce(textResponse(404)) // probe acct 1
      .mockResolvedValueOnce(textResponse(404)) // probe acct 2
      .mockResolvedValueOnce(textResponse(404)) // GET before create
      .mockResolvedValueOnce(jsonResponse(200, { name: `session-${sessionId}` })) // create
      .mockResolvedValueOnce(jsonResponse(200, { name: `session-${sessionId}` })); // update props

    const { createOrGetDailyRoom } = await import("@/lib/daily");
    const result = await createOrGetDailyRoom(sessionId);

    expect(result.account.id).toBe("1");
    expect(sessionsCol.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({
        _id: expect.any(ObjectId),
        $or: expect.any(Array),
      }),
      expect.objectContaining({
        $set: expect.objectContaining({ daily_account_id: "1" }),
      }),
    );
  });

  it("reuses the winner when the claim is lost", async () => {
    sessionsCol.findOne
      .mockResolvedValueOnce(null) // initial stored read
      .mockResolvedValueOnce({ daily_account_id: "2" }); // after lost claim
    sessionsCol.updateOne.mockResolvedValueOnce({
      matchedCount: 0,
      modifiedCount: 0,
    });

    fetchMock
      .mockResolvedValueOnce(textResponse(404)) // probe 1
      .mockResolvedValueOnce(textResponse(404)) // probe 2
      // settle on winner account 2
      .mockResolvedValueOnce(textResponse(404)) // GET
      .mockResolvedValueOnce(jsonResponse(200, { name: "room" })) // create
      .mockResolvedValueOnce(jsonResponse(200, { name: "room" })); // update

    const { createOrGetDailyRoom } = await import("@/lib/daily");
    const result = await createOrGetDailyRoom(sessionId);
    expect(result.account.id).toBe("2");
  });

  it("fails over to the next account when create returns 429 and no room exists", async () => {
    sessionsCol.findOne.mockResolvedValue({ daily_account_id: "1" });

    fetchMock
      // ensure on stored account 1: GET 404, create 429
      .mockResolvedValueOnce(textResponse(404))
      .mockResolvedValueOnce(textResponse(429, "quota"))
      // settle on account 2 after release
      .mockResolvedValueOnce(textResponse(404))
      .mockResolvedValueOnce(jsonResponse(200, { name: "room" }))
      .mockResolvedValueOnce(jsonResponse(200, { name: "room" }));

    // After release, pick returns account 1 again — skipIds should force account 2.
    settingsCol.findOneAndUpdate.mockResolvedValue({
      _id: "daily",
      rotationCounter: 1,
    });

    const { createOrGetDailyRoom } = await import("@/lib/daily");
    const result = await createOrGetDailyRoom(sessionId);

    expect(result.account.id).toBe("2");
    expect(sessionsCol.updateOne).toHaveBeenCalledWith(
      expect.objectContaining({ daily_account_id: "1" }),
      expect.objectContaining({
        $unset: expect.objectContaining({ daily_account_id: "" }),
      }),
    );
  });

  it("does not move an existing room when GET returns 5xx", async () => {
    sessionsCol.findOne.mockResolvedValue({ daily_account_id: "1" });

    fetchMock.mockResolvedValueOnce(textResponse(503, "unavailable"));

    const { createOrGetDailyRoom } = await import("@/lib/daily");
    await expect(createOrGetDailyRoom(sessionId)).rejects.toThrow(
      /Daily room error: 503/,
    );

    // No release / claim overwrite of a different account.
    const unsetCalls = sessionsCol.updateOne.mock.calls.filter(
      (call: unknown[]) =>
        call[1] &&
        typeof call[1] === "object" &&
        call[1] !== null &&
        "$unset" in call[1],
    );
    expect(unsetCalls).toHaveLength(0);
  });

  it("does not invent a room elsewhere when a probe is inconclusive", async () => {
    sessionsCol.findOne.mockResolvedValue(null);

    fetchMock
      .mockResolvedValueOnce(textResponse(404)) // account 1 miss
      .mockResolvedValueOnce(textResponse(503)); // account 2 abort

    const { createOrGetDailyRoom } = await import("@/lib/daily");
    await expect(createOrGetDailyRoom(sessionId)).rejects.toThrow(
      /probe inconclusive/,
    );

    const createPosts = fetchMock.mock.calls.filter(
      (call: unknown[]) =>
        typeof call[0] === "string" &&
        call[0] === "https://api.daily.co/v1/rooms" &&
        call[1] &&
        typeof call[1] === "object" &&
        (call[1] as { method?: string }).method === "POST",
    );
    expect(createPosts).toHaveLength(0);
  });
});
