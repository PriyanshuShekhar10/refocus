import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockRequest, parseResponse, mockCollection, mockDb, mockSession } from "../helpers";

vi.mock("@/lib/requireVerifiedEmail", () => ({ requireVerifiedEmail: vi.fn().mockResolvedValue(null) }));
const users = mockCollection();
const db = mockDb({ users });
vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn().mockImplementation(() => Promise.resolve(db)) }));

import { PATCH } from "@/app/api/users/me/route";
import { POST as REFINE } from "@/app/api/ai/refine-goal/route";

const ME = new ObjectId();
const patch = (body: Record<string, unknown>) =>
  PATCH(mockRequest("/api/users/me", { method: "PATCH", body }));

describe("PATCH /api/users/me input limits", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(String(ME));
  });

  it.each([
    ["non-text name", { firstname: { $gt: "" } }],
    ["huge bio", { about: "x".repeat(1001) }],
    ["too many interests", { interests: Array.from({ length: 21 }, (_, i) => `i${i}`) }],
    ["non-text interest", { interests: [123] }],
    ["array aboutMe", { aboutMe: ["x"] }],
  ])("rejects %s without writing", async (_label, body) => {
    const { status } = await parseResponse(await patch(body));
    expect(status).toBe(400);
    expect(users.updateOne).not.toHaveBeenCalled();
  });
});

describe("POST /api/ai/refine-goal input limits", () => {
  beforeEach(() => mockSession(String(ME)));

  it("rejects goals over 500 characters", async () => {
    const { status } = await parseResponse(
      await REFINE(mockRequest("/api/ai/refine-goal", { method: "POST", body: { goal: "x".repeat(501) } })),
    );
    expect(status).toBe(400);
  });

  it("rejects non-text goals", async () => {
    const { status } = await parseResponse(
      await REFINE(mockRequest("/api/ai/refine-goal", { method: "POST", body: { goal: { a: 1 } } })),
    );
    expect(status).toBe(400);
  });
});
