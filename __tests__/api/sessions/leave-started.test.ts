import { describe, it, expect, vi, beforeEach } from "vitest";
import { mockRequest, parseResponse, mockCollection, mockDb, mockSession } from "../../helpers";
import { ObjectId } from "mongodb";

const notifySessionCancelled = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));

vi.mock("@/lib/notifySessionCancelled", () => ({ notifySessionCancelled }));
vi.mock("@/lib/requireVerifiedEmail", () => ({ requireVerifiedEmail: vi.fn().mockResolvedValue(null) }));
vi.mock("@/lib/sessionLifecycleEvents", () => ({ logSessionDeleted: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/sessionRealtime", () => ({
  publishSessionDocUpserted: vi.fn().mockResolvedValue(undefined),
  publishSessionRemoved: vi.fn().mockResolvedValue(undefined),
}));

const sessionsCol = mockCollection();
const db = mockDb({ sessions: sessionsCol });
vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

import { POST as LEAVE } from "@/app/api/sessions/[id]/leave/route";
import { DELETE } from "@/app/api/sessions/[id]/route";

const OWNER_ID = new ObjectId();
const JOINER_ID = new ObjectId();
const SESSION_ID = new ObjectId();

function session(startOffsetMin: number) {
  const start = new Date(Date.now() + startOffsetMin * 60 * 1000);
  return {
    _id: SESSION_ID,
    owner_id: String(OWNER_ID),
    start_time: start,
    end_time: new Date(start.getTime() + 50 * 60 * 1000),
    duration_min: 50,
    session_type: "focus",
    session_participants: [
      { user_id: String(OWNER_ID), joined_at: new Date() },
      { user_id: String(JOINER_ID), joined_at: new Date() },
    ],
  };
}

const leave = () =>
  LEAVE(
    mockRequest(`/api/sessions/${SESSION_ID}/leave`, { method: "POST", body: {} }),
    { params: Promise.resolve({ id: String(SESSION_ID) }) },
  );

describe("POST /api/sessions/:id/leave once started", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionsCol.updateOne.mockResolvedValue({ modifiedCount: 1 });
    mockSession(String(JOINER_ID));
  });

  it("still lets the joiner leave before the session starts", async () => {
    sessionsCol.findOne.mockResolvedValue(session(60));
    const { status } = await parseResponse(await leave());
    expect(status).toBe(200);
    expect(sessionsCol.updateOne).toHaveBeenCalled();
  });

  it("refuses once the session has started and changes nothing", async () => {
    sessionsCol.findOne.mockResolvedValue(session(-5));
    const { status, json } = await parseResponse(await leave());
    expect(status).toBe(409);
    expect(json.error).toMatch(/already started/i);
    expect(sessionsCol.updateOne).not.toHaveBeenCalled();
    expect(notifySessionCancelled).not.toHaveBeenCalled();
  });
});

const del = () =>
  DELETE(
    mockRequest(`/api/sessions/${SESSION_ID}`, { method: "DELETE", body: {} }),
    { params: Promise.resolve({ id: String(SESSION_ID) }) },
  );

describe("DELETE /api/sessions/:id once started", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionsCol.updateOne.mockResolvedValue({ modifiedCount: 1 });
    sessionsCol.deleteOne.mockResolvedValue({ deletedCount: 1 });
    mockSession(String(OWNER_ID));
  });

  it("still lets the owner delete before the session starts", async () => {
    sessionsCol.findOne.mockResolvedValue(session(60));
    const { status } = await parseResponse(await del());
    expect(status).toBe(200);
  });

  it("refuses once the session has started and changes nothing", async () => {
    sessionsCol.findOne.mockResolvedValue(session(-5));
    const { status, json } = await parseResponse(await del());
    expect(status).toBe(409);
    expect(json.error).toMatch(/already started/i);
    expect(sessionsCol.updateOne).not.toHaveBeenCalled();
    expect(sessionsCol.deleteOne).not.toHaveBeenCalled();
    expect(notifySessionCancelled).not.toHaveBeenCalled();
  });
});
