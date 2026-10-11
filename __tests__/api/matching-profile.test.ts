import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockRequest, parseResponse, mockCollection, mockDb, mockSession } from "../helpers";

const users = mockCollection();
const db = mockDb({ users });
vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn().mockImplementation(() => Promise.resolve(db)) }));

import { GET, PUT } from "@/app/api/users/me/matching-profile/route";

const ME = new ObjectId();
const put = (body: Record<string, unknown>) =>
  PUT(mockRequest("/api/users/me/matching-profile", { method: "PUT", body }));

describe("/api/users/me/matching-profile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(String(ME));
    users.findOne.mockResolvedValue({ _id: ME, matchingProfile: { gender: "Woman", focus: ["Coding"] } });
  });

  it("requires a signed-in user", async () => {
    mockSession(null);
    expect((await parseResponse(await GET())).status).toBe(401);
    expect((await parseResponse(await put({ gender: "Woman" }))).status).toBe(401);
  });

  it("returns defaults for missing fields", async () => {
    users.findOne.mockResolvedValue({ _id: ME });
    const { json } = await parseResponse(await GET());
    expect(json.matchingProfile).toEqual({ gender: null, generation: null, focus: [], onboardingSeenAt: null });
  });

  it("saves valid answers, de-duplicating focus, and null clears", async () => {
    const { status } = await parseResponse(
      await put({ gender: null, generation: "Gen Z", focus: ["Coding", "Coding", "Reading"] }),
    );
    expect(status).toBe(200);
    const update = users.updateOne.mock.calls[0][1].$set;
    expect(update["matchingProfile.gender"]).toBeNull();
    expect(update["matchingProfile.generation"]).toBe("Gen Z");
    expect(update["matchingProfile.focus"]).toEqual(["Coding", "Reading"]);
    expect(update["matchingProfile.updatedAt"]).toBeInstanceOf(Date);
  });

  it.each([
    ["unknown gender", { gender: "Robot" }],
    ["unknown generation", { generation: "Gen Q" }],
    ["unknown focus", { focus: ["Sleeping"] }],
    ["non-array focus", { focus: "Coding" }],
  ])("rejects %s without writing", async (_label, body) => {
    const { status } = await parseResponse(await put(body));
    expect(status).toBe(400);
    expect(users.updateOne).not.toHaveBeenCalled();
  });

  it("only records the first time the tour was seen", async () => {
    await put({ onboardingSeen: true });
    expect(users.updateOne).toHaveBeenCalledWith(
      { _id: ME, onboardingSeenAt: { $exists: false } },
      { $set: { onboardingSeenAt: expect.any(Date) } },
    );
  });
});
