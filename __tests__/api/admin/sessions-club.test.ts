import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";
import {
  mockRequest,
  parseResponse,
  mockCollection,
  mockDb,
} from "../../helpers";

const sessionsCol = mockCollection();
const db = mockDb({ sessions: sessionsCol });

const logAdminAction = vi.hoisted(() => vi.fn());
const areUsersBlocked = vi.hoisted(() => vi.fn());
const notifySessionMatched = vi.hoisted(() => vi.fn());
const publishSessionDocUpserted = vi.hoisted(() => vi.fn());
const publishSessionRemoved = vi.hoisted(() => vi.fn());

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
}));

vi.mock("@/lib/adminAudit", () => ({
  logAdminAction,
}));

vi.mock("@/lib/blocking", () => ({
  areUsersBlocked,
}));

vi.mock("@/lib/notifySessionMatched", () => ({
  notifySessionMatched,
}));

vi.mock("@/lib/sessionRealtime", () => ({
  publishSessionDocUpserted,
  publishSessionRemoved,
}));

import { requireAdmin } from "@/lib/admin";
import { POST } from "@/app/api/admin/sessions/club/route";

const FUTURE_START = new Date(Date.now() + 60 * 60 * 1000);
const FUTURE_END = new Date(FUTURE_START.getTime() + 50 * 60 * 1000);

function soloSession(opts: {
  id?: ObjectId;
  ownerId: string;
  start?: Date;
  end?: Date;
  durationMin?: number;
  participantCount?: number;
  participants?: Array<{ user_id: string; quiet?: boolean; label?: string }>;
}) {
  const ownerId = opts.ownerId;
  return {
    _id: opts.id ?? new ObjectId(),
    owner_id: ownerId,
    start_time: opts.start ?? FUTURE_START,
    end_time: opts.end ?? FUTURE_END,
    duration_min: opts.durationMin ?? 50,
    session_type: "focus",
    status: "available",
    participant_count: opts.participantCount ?? 1,
    session_participants: opts.participants ?? [
      { user_id: ownerId, joined_at: new Date() },
    ],
  };
}

describe("POST /api/admin/sessions/club", () => {
  const adminId = String(new ObjectId());
  const userA = String(new ObjectId());
  const userB = String(new ObjectId());
  const keepId = new ObjectId();
  const absorbId = new ObjectId();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      admin: { userId: adminId, email: "admin@example.com" },
    });
    areUsersBlocked.mockResolvedValue(false);
    logAdminAction.mockResolvedValue(undefined);
    notifySessionMatched.mockResolvedValue(undefined);
    publishSessionDocUpserted.mockResolvedValue(undefined);
    publishSessionRemoved.mockResolvedValue(undefined);
    sessionsCol.deleteOne.mockResolvedValue({ deletedCount: 1 });
  });

  it("rejects non-admins", async () => {
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: false,
      response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    });
    const req = mockRequest("/api/admin/sessions/club", {
      method: "POST",
      body: { keepId: String(keepId), absorbId: String(absorbId) },
    });
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(403);
    expect(sessionsCol.findOne).not.toHaveBeenCalled();
  });

  it("clubs two solo same-slot sessions and notifies both", async () => {
    const keep = soloSession({ id: keepId, ownerId: userA });
    const absorb = soloSession({
      id: absorbId,
      ownerId: userB,
      participants: [{ user_id: userB, quiet: true, label: "Deep work" }],
    });
    sessionsCol.findOne
      .mockResolvedValueOnce(keep)
      .mockResolvedValueOnce(absorb);

    const booked = {
      ...keep,
      status: "booked",
      participant_count: 2,
      session_participants: [
        keep.session_participants[0],
        { user_id: userB, joined_at: expect.any(Date), quiet: true, label: "Deep work" },
      ],
    };
    sessionsCol.findOneAndUpdate.mockResolvedValue(booked);

    const req = mockRequest("/api/admin/sessions/club", {
      method: "POST",
      body: { keepId: String(keepId), absorbId: String(absorbId) },
    });
    const { status, json } = await parseResponse(await POST(req));

    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.sessionId).toBe(String(keepId));
    expect(json.removedSessionId).toBe(String(absorbId));

    expect(sessionsCol.findOneAndUpdate).toHaveBeenCalled();
    const [, update] = sessionsCol.findOneAndUpdate.mock.calls[0];
    expect(update.$push.session_participants.user_id).toBe(userB);
    expect(update.$push.session_participants.quiet).toBe(true);
    expect(update.$set.status).toBe("booked");
    expect(update.$set.participant_count).toBe(2);

    expect(sessionsCol.deleteOne).toHaveBeenCalledWith({
      _id: absorbId,
    });
    expect(publishSessionRemoved).toHaveBeenCalledWith(String(absorbId));
    expect(publishSessionDocUpserted).toHaveBeenCalled();
    expect(notifySessionMatched).toHaveBeenCalledWith(
      db,
      expect.objectContaining({ _id: keepId }),
    );
    expect(logAdminAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: adminId,
        action: "session.club",
        resourceId: String(keepId),
      }),
    );
  });

  it("rejects different start times", async () => {
    const keep = soloSession({ id: keepId, ownerId: userA });
    const absorb = soloSession({
      id: absorbId,
      ownerId: userB,
      start: new Date(FUTURE_START.getTime() + 30 * 60 * 1000),
      end: new Date(FUTURE_END.getTime() + 30 * 60 * 1000),
    });
    sessionsCol.findOne
      .mockResolvedValueOnce(keep)
      .mockResolvedValueOnce(absorb);

    const req = mockRequest("/api/admin/sessions/club", {
      method: "POST",
      body: { keepId: String(keepId), absorbId: String(absorbId) },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(409);
    expect(json.error).toMatch(/start time and duration/i);
    expect(sessionsCol.findOneAndUpdate).not.toHaveBeenCalled();
  });

  it("rejects different durations", async () => {
    const keep = soloSession({ id: keepId, ownerId: userA, durationMin: 50 });
    const absorb = soloSession({
      id: absorbId,
      ownerId: userB,
      durationMin: 25,
    });
    sessionsCol.findOne
      .mockResolvedValueOnce(keep)
      .mockResolvedValueOnce(absorb);

    const req = mockRequest("/api/admin/sessions/club", {
      method: "POST",
      body: { keepId: String(keepId), absorbId: String(absorbId) },
    });
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(409);
  });

  it("rejects already booked sessions", async () => {
    const keep = soloSession({
      id: keepId,
      ownerId: userA,
      participantCount: 2,
      participants: [
        { user_id: userA },
        { user_id: String(new ObjectId()) },
      ],
    });
    const absorb = soloSession({ id: absorbId, ownerId: userB });
    sessionsCol.findOne
      .mockResolvedValueOnce(keep)
      .mockResolvedValueOnce(absorb);

    const req = mockRequest("/api/admin/sessions/club", {
      method: "POST",
      body: { keepId: String(keepId), absorbId: String(absorbId) },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(409);
    expect(json.error).toMatch(/open solo/i);
  });

  it("rejects sessions that have already started", async () => {
    const started = new Date(Date.now() - 5 * 60 * 1000);
    const end = new Date(started.getTime() + 50 * 60 * 1000);
    const keep = soloSession({
      id: keepId,
      ownerId: userA,
      start: started,
      end,
    });
    const absorb = soloSession({
      id: absorbId,
      ownerId: userB,
      start: started,
      end,
    });
    sessionsCol.findOne
      .mockResolvedValueOnce(keep)
      .mockResolvedValueOnce(absorb);

    const req = mockRequest("/api/admin/sessions/club", {
      method: "POST",
      body: { keepId: String(keepId), absorbId: String(absorbId) },
    });
    const { status, json } = await parseResponse(await POST(req));
    expect(status).toBe(400);
    expect(json.error).toMatch(/already started/i);
  });

  it("rejects blocked users", async () => {
    const keep = soloSession({ id: keepId, ownerId: userA });
    const absorb = soloSession({ id: absorbId, ownerId: userB });
    sessionsCol.findOne
      .mockResolvedValueOnce(keep)
      .mockResolvedValueOnce(absorb);
    areUsersBlocked.mockResolvedValue(true);

    const req = mockRequest("/api/admin/sessions/club", {
      method: "POST",
      body: { keepId: String(keepId), absorbId: String(absorbId) },
    });
    const { status } = await parseResponse(await POST(req));
    expect(status).toBe(403);
    expect(sessionsCol.findOneAndUpdate).not.toHaveBeenCalled();
  });
});
