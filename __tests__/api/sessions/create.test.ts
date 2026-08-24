import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  mockRequest,
  parseResponse,
  mockCollection,
  mockDb,
  mockSession,
  alignedFutureIso,
  alignedPastIso,
} from "../../helpers";
import { ObjectId } from "mongodb";

// Stub rate limiter so we can drive 429 behavior independently.
const rl = vi.hoisted(() => ({
  checkRateLimit: vi.fn(),
  rateLimitedResponse: vi.fn(),
}));

vi.mock("@/lib/ratelimit", () => ({
  checkRateLimit: rl.checkRateLimit,
  rateLimitedResponse: rl.rateLimitedResponse,
}));

const sessionsCol = mockCollection();
const db = mockDb({ sessions: sessionsCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

vi.mock("@/lib/ably-server", () => ({
  publishAbly: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/sse", () => ({
  publish: vi.fn().mockResolvedValue(undefined),
  sessionsChannel: () => "sessions:updates",
}));

const isEngagementCrewUserId = vi.hoisted(() => vi.fn());

vi.mock("@/lib/engagementCrew", () => ({
  isEngagementCrewUserId,
}));

import { POST } from "@/app/api/sessions/route";

const USER_ID = "user-xyz";

describe("POST /api/sessions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ID);
    isEngagementCrewUserId.mockResolvedValue(false);
    rl.checkRateLimit.mockResolvedValue({
      success: true,
      limit: 100,
      remaining: 99,
      reset: Date.now() + 60_000,
    });
    rl.rateLimitedResponse.mockReturnValue(
      new Response(JSON.stringify({ error: "Too many" }), { status: 429 }),
    );
    sessionsCol.findOne.mockResolvedValue(null); // no overlap by default
    sessionsCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
  });

  it("rejects past start times", async () => {
    const past = alignedPastIso();
    const req = mockRequest("/api/sessions", {
      body: { start: past, durationMin: 25, sessionType: "focus" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(json.error).toMatch(/past|current/i);
  });

  it("rejects start times not on a 30-minute mark", async () => {
    const misaligned = new Date(
      Math.ceil(Date.now() / (30 * 60_000)) * (30 * 60_000) + 15 * 60_000,
    ).toISOString();
    const req = mockRequest("/api/sessions", {
      body: { start: misaligned, durationMin: 25, sessionType: "focus" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(json.error).toMatch(/30-minute/i);
    expect(sessionsCol.insertOne).not.toHaveBeenCalled();
  });

  it("rejects invalid durationMin", async () => {
    const start = alignedFutureIso();
    const req = mockRequest("/api/sessions", {
      body: { start, durationMin: 17, sessionType: "focus" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(json.error).toMatch(/durationMin/);
  });

  it("rejects invalid sessionType", async () => {
    const start = alignedFutureIso();
    const req = mockRequest("/api/sessions", {
      body: { start, durationMin: 25, sessionType: "marathon" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(json.error).toMatch(/sessionType/);
  });

  it("rejects bookings beyond the horizon", async () => {
    const tooFar = alignedFutureIso(200 * 24 * 60 * 60 * 1000);
    const req = mockRequest("/api/sessions", {
      body: { start: tooFar, durationMin: 25, sessionType: "focus" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(json.error).toMatch(/days in advance/);
  });

  it("rejects overlap with existing user session (409)", async () => {
    sessionsCol.findOne.mockResolvedValueOnce({ _id: new ObjectId() });
    const start = alignedFutureIso();
    const req = mockRequest("/api/sessions", {
      body: { start, durationMin: 25, sessionType: "focus" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(409);
    expect(json.error).toMatch(/already have a session/);
  });

  it("creates a session when valid + non-overlapping", async () => {
    const start = alignedFutureIso();
    const req = mockRequest("/api/sessions", {
      body: { start, durationMin: 25, sessionType: "focus", quietOwner: true },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(typeof json.id).toBe("string");
    const inserted = sessionsCol.insertOne.mock.calls[0][0];
    expect(inserted.owner_id).toBe(USER_ID);
    expect(inserted.session_participants[0]).toMatchObject({
      user_id: USER_ID,
      quiet: true,
    });
  });

  it("returns 401 without a session", async () => {
    mockSession(null);
    const req = mockRequest("/api/sessions", {
      body: {
        start: alignedFutureIso(),
        durationMin: 25,
        sessionType: "focus",
      },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(401);
    expect(json.error).toBe("Unauthorized");
  });

  it("rejects crew creating a session less than 1 hour ahead", async () => {
    isEngagementCrewUserId.mockResolvedValue(true);
    // Next 30-min mark is always < 1 hour from "now" (at most ~30m).
    const start = alignedFutureIso(1_000);
    const req = mockRequest("/api/sessions", {
      body: { start, durationMin: 50, sessionType: "focus" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(json.error).toMatch(/1 hour/i);
    expect(sessionsCol.insertOne).not.toHaveBeenCalled();
  });

  it("rejects crew creating a 25-minute session", async () => {
    isEngagementCrewUserId.mockResolvedValue(true);
    const start = alignedFutureIso(61 * 60 * 1000);
    const req = mockRequest("/api/sessions", {
      body: { start, durationMin: 25, sessionType: "focus" },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(json.error).toMatch(/25-minute/i);
    expect(sessionsCol.insertOne).not.toHaveBeenCalled();
  });

  it("allows crew creating a 50-minute session at least 1 hour ahead", async () => {
    isEngagementCrewUserId.mockResolvedValue(true);
    const start = alignedFutureIso(61 * 60 * 1000);
    const req = mockRequest("/api/sessions", {
      body: { start, durationMin: 50, sessionType: "focus" },
    });
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(200);
    expect(sessionsCol.insertOne).toHaveBeenCalled();
  });
});
