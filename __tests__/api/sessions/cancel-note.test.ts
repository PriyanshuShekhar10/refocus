import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse, mockCollection, mockDb, mockSession } from "../../helpers";
import { ObjectId } from "mongodb";

const notifySessionCancelled = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/lib/notifySessionCancelled", () => ({
  notifySessionCancelled,
}));

vi.mock("@/lib/sessionRealtime", () => ({
  publishSessionDocUpserted: vi.fn().mockResolvedValue(undefined),
  publishSessionRemoved: vi.fn().mockResolvedValue(undefined),
}));

const sessionsCol = mockCollection();
const lifecycleCol = mockCollection();
const db = mockDb({
  sessions: sessionsCol,
  session_lifecycle_events: lifecycleCol,
});

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

import { DELETE } from "@/app/api/sessions/[id]/route";
import { POST as LEAVE } from "@/app/api/sessions/[id]/leave/route";

const OWNER_ID = new ObjectId();
const JOINER_ID = new ObjectId();
const SESSION_ID = new ObjectId();
const START = new Date(Date.now() + 60 * 60 * 1000);
const END = new Date(START.getTime() + 50 * 60 * 1000);

function makeParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

function bookedSession() {
  return {
    _id: SESSION_ID,
    owner_id: String(OWNER_ID),
    start_time: START,
    end_time: END,
    duration_min: 50,
    session_type: "focus",
    session_participants: [
      { user_id: String(OWNER_ID), joined_at: new Date() },
      { user_id: String(JOINER_ID), joined_at: new Date() },
    ],
  };
}

function soloSession() {
  return {
    _id: SESSION_ID,
    owner_id: String(OWNER_ID),
    start_time: START,
    end_time: END,
    duration_min: 50,
    session_type: "focus",
    session_participants: [
      { user_id: String(OWNER_ID), joined_at: new Date() },
    ],
  };
}

describe("session cancel notes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifySessionCancelled.mockResolvedValue(undefined);
    sessionsCol.findOne.mockResolvedValue(bookedSession());
    sessionsCol.updateOne.mockResolvedValue({ modifiedCount: 1 });
    sessionsCol.deleteOne.mockResolvedValue({ deletedCount: 1 });
    lifecycleCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    lifecycleCol.createIndex.mockResolvedValue("idx");
  });

  it("emails the partner when the owner deletes with a note", async () => {
    mockSession(String(OWNER_ID));
    const req = mockRequest(`/api/sessions/${SESSION_ID}`, {
      method: "DELETE",
      body: { message: "  Something came up  " },
    });
    const { status, json } = await parseResponse(
      await DELETE(req, makeParams(String(SESSION_ID))),
    );
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(notifySessionCancelled).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        actorUserId: String(OWNER_ID),
        message: "Something came up",
        kind: "delete",
      }),
    );
    expect(lifecycleCol.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "session_deleted",
        userId: String(OWNER_ID),
        sessionId: String(SESSION_ID),
        kind: "transfer",
      }),
    );
  });

  it("logs a hard-delete lifecycle event for solo cancel", async () => {
    sessionsCol.findOne.mockResolvedValue(soloSession());
    mockSession(String(OWNER_ID));
    const req = mockRequest(`/api/sessions/${SESSION_ID}`, {
      method: "DELETE",
      body: {},
    });
    const { status } = await parseResponse(
      await DELETE(req, makeParams(String(SESSION_ID))),
    );
    expect(status).toBe(200);
    expect(sessionsCol.deleteOne).toHaveBeenCalled();
    expect(lifecycleCol.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "session_deleted",
        kind: "hard",
      }),
    );
  });

  it("does not email when the owner deletes without a note", async () => {
    mockSession(String(OWNER_ID));
    const req = mockRequest(`/api/sessions/${SESSION_ID}`, {
      method: "DELETE",
      body: {},
    });
    const { status } = await parseResponse(
      await DELETE(req, makeParams(String(SESSION_ID))),
    );
    expect(status).toBe(200);
    expect(notifySessionCancelled).not.toHaveBeenCalled();
  });

  it("emails the owner when a participant leaves with a note", async () => {
    mockSession(String(JOINER_ID));
    const req = mockRequest(`/api/sessions/${SESSION_ID}/leave`, {
      body: { message: "Can't make it" },
    });
    const { status, json } = await parseResponse(
      await LEAVE(req, makeParams(String(SESSION_ID))),
    );
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(notifySessionCancelled).toHaveBeenCalledWith(
      db,
      expect.objectContaining({
        actorUserId: String(JOINER_ID),
        message: "Can't make it",
        kind: "leave",
      }),
    );
  });
});
