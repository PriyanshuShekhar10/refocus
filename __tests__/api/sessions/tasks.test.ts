import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import {
  mockRequest,
  parseResponse,
  mockCollection,
  mockDb,
  mockSession,
} from "../../helpers";
import { publishAbly } from "@/lib/ably-server";
import { SESSION_TASKS_PER_OWNER_MAX } from "@/lib/sessionTasks";

const sessionsCol = mockCollection();
const db = mockDb({ sessions: sessionsCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

vi.mock("@/lib/ably-server", () => ({
  publishAbly: vi.fn().mockResolvedValue(undefined),
}));

import { DELETE, GET, PATCH, POST } from "@/app/api/sessions/[id]/tasks/route";

const USER_ID = "user123";
const PARTNER_ID = "partner456";
const SESSION_ID = new ObjectId();

function makeParams(id = String(SESSION_ID)) {
  return { params: Promise.resolve({ id }) };
}

function makeSession(overrides: Record<string, unknown> = {}) {
  return {
    _id: SESSION_ID,
    owner_id: USER_ID,
    session_participants: [
      { user_id: USER_ID },
      { user_id: PARTNER_ID },
    ],
    session_tasks: [],
    ...overrides,
  };
}

describe("/api/sessions/:id/tasks", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(USER_ID);
    sessionsCol.findOne.mockResolvedValue(makeSession());
    sessionsCol.updateOne.mockResolvedValue({ modifiedCount: 1 });
  });

  it("returns 401 when not authenticated", async () => {
    mockSession(null);
    const { status } = await parseResponse(
      await GET(mockRequest("/api/sessions/x/tasks", { method: "GET" }), makeParams()),
    );
    expect(status).toBe(401);
  });

  it("returns 403 for non-participants", async () => {
    mockSession("stranger");
    const { status, json } = await parseResponse(
      await GET(mockRequest("/api/sessions/x/tasks", { method: "GET" }), makeParams()),
    );
    expect(status).toBe(403);
    expect(json.error).toBe("Forbidden");
  });

  it("returns 404 when the session is missing", async () => {
    sessionsCol.findOne.mockResolvedValue(null);
    const { status } = await parseResponse(
      await GET(mockRequest("/api/sessions/x/tasks", { method: "GET" }), makeParams()),
    );
    expect(status).toBe(404);
  });

  it("lists tasks for a participant", async () => {
    sessionsCol.findOne.mockResolvedValue(
      makeSession({
        session_tasks: [
          {
            id: "t1",
            ownerId: USER_ID,
            title: "Draft intro",
            done: false,
            sort: 0,
            createdAt: new Date("2026-08-17T10:00:00.000Z"),
            updatedAt: new Date("2026-08-17T10:00:00.000Z"),
          },
        ],
      }),
    );
    const { status, json } = await parseResponse(
      await GET(mockRequest("/api/sessions/x/tasks", { method: "GET" }), makeParams()),
    );
    expect(status).toBe(200);
    expect(json.tasks).toHaveLength(1);
    expect(json.tasks[0].title).toBe("Draft intro");
  });

  it("adds a task to the current user's list and publishes Ably", async () => {
    const req = mockRequest(`/api/sessions/${SESSION_ID}/tasks`, {
      body: { title: "  Finish notes  " },
    });
    const { status, json } = await parseResponse(await POST(req, makeParams()));
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.task.title).toBe("Finish notes");
    expect(json.task.ownerId).toBe(USER_ID);
    expect(json.task.done).toBe(false);
    expect(sessionsCol.updateOne).toHaveBeenCalled();
    expect(publishAbly).toHaveBeenCalledWith(
      `session:${SESSION_ID}:tasks`,
      expect.objectContaining({ type: "session_tasks_updated" }),
    );
  });

  it("caps each owner at 12 tasks", async () => {
    sessionsCol.findOne.mockResolvedValue(
      makeSession({
        session_tasks: Array.from({ length: SESSION_TASKS_PER_OWNER_MAX }, (_, i) => ({
          id: `t${i}`,
          ownerId: USER_ID,
          title: `Task ${i}`,
          done: false,
          sort: i,
          createdAt: new Date(),
          updatedAt: new Date(),
        })),
      }),
    );
    const req = mockRequest(`/api/sessions/${SESSION_ID}/tasks`, {
      body: { title: "One more" },
    });
    const { status, json } = await parseResponse(await POST(req, makeParams()));
    expect(status).toBe(400);
    expect(json.error).toMatch(/at most 12/i);
    expect(publishAbly).not.toHaveBeenCalled();
  });

  it("rejects titles over 80 characters by truncating via normalize on empty after trim", async () => {
    const req = mockRequest(`/api/sessions/${SESSION_ID}/tasks`, {
      body: { title: "   " },
    });
    const { status } = await parseResponse(await POST(req, makeParams()));
    expect(status).toBe(400);
  });

  it("lets the owner toggle their task", async () => {
    sessionsCol.findOne.mockResolvedValue(
      makeSession({
        session_tasks: [
          {
            id: "t1",
            ownerId: USER_ID,
            title: "Draft intro",
            done: false,
            sort: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }),
    );
    const req = mockRequest(`/api/sessions/${SESSION_ID}/tasks`, {
      method: "PATCH",
      body: { taskId: "t1", done: true },
    });
    const { status, json } = await parseResponse(await PATCH(req, makeParams()));
    expect(status).toBe(200);
    expect(json.tasks[0].done).toBe(true);
    expect(publishAbly).toHaveBeenCalled();
  });

  it("does not let a user check off the partner's task", async () => {
    sessionsCol.findOne.mockResolvedValue(
      makeSession({
        session_tasks: [
          {
            id: "p1",
            ownerId: PARTNER_ID,
            title: "Partner work",
            done: false,
            sort: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }),
    );
    const req = mockRequest(`/api/sessions/${SESSION_ID}/tasks`, {
      method: "PATCH",
      body: { taskId: "p1", done: true },
    });
    const { status, json } = await parseResponse(await PATCH(req, makeParams()));
    expect(status).toBe(403);
    expect(json.error).toBe("Forbidden");
    expect(publishAbly).not.toHaveBeenCalled();
  });

  it("does not let a user delete the partner's task", async () => {
    sessionsCol.findOne.mockResolvedValue(
      makeSession({
        session_tasks: [
          {
            id: "p1",
            ownerId: PARTNER_ID,
            title: "Partner work",
            done: false,
            sort: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }),
    );
    const req = mockRequest(`/api/sessions/${SESSION_ID}/tasks`, {
      method: "DELETE",
      body: { taskId: "p1" },
    });
    const { status } = await parseResponse(await DELETE(req, makeParams()));
    expect(status).toBe(403);
  });

  it("deletes the owner's task", async () => {
    sessionsCol.findOne.mockResolvedValue(
      makeSession({
        session_tasks: [
          {
            id: "t1",
            ownerId: USER_ID,
            title: "Draft intro",
            done: false,
            sort: 0,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        ],
      }),
    );
    const req = mockRequest(`/api/sessions/${SESSION_ID}/tasks`, {
      method: "DELETE",
      body: { taskId: "t1" },
    });
    const { status, json } = await parseResponse(await DELETE(req, makeParams()));
    expect(status).toBe(200);
    expect(json.tasks).toHaveLength(0);
    expect(publishAbly).toHaveBeenCalled();
  });
});
