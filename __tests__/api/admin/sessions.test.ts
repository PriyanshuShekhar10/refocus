import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb, parseResponse } from "../../helpers";

function fluentFind(rows: unknown[] = []) {
  const cursor: Record<string, unknown> = {};
  cursor.sort = vi.fn(() => cursor);
  cursor.limit = vi.fn(() => cursor);
  cursor.skip = vi.fn(() => cursor);
  cursor.project = vi.fn(() => cursor);
  cursor.toArray = vi.fn().mockResolvedValue(rows);
  return cursor;
}

const sessionsCol = mockCollection();
const usersCol = mockCollection();
const db = mockDb({ sessions: sessionsCol, users: usersCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

vi.mock("@/lib/admin", () => ({
  requireAdmin: vi.fn(),
  isUserAdmin: vi.fn(),
  ADMIN_ROLE: "admin",
}));

import { requireAdmin } from "@/lib/admin";
import { GET } from "@/app/api/admin/sessions/route";

describe("GET /api/admin/sessions", () => {
  const hostId = String(new ObjectId());
  const guestId = String(new ObjectId());

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(requireAdmin).mockResolvedValue({
      ok: true,
      admin: { userId: String(new ObjectId()), email: "admin@example.com" },
    });
    sessionsCol.countDocuments.mockResolvedValue(1);
    sessionsCol.find.mockReturnValue(
      fluentFind([
        {
          _id: new ObjectId(),
          owner_id: hostId,
          start_time: new Date("2026-08-18T10:00:00.000Z"),
          end_time: new Date("2026-08-18T10:50:00.000Z"),
          duration_min: 50,
          session_type: "focus",
          status: "booked",
          session_participants: [
            { user_id: hostId },
            { user_id: guestId },
          ],
        },
      ]),
    );
    usersCol.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          _id: new ObjectId(hostId),
          firstname: "Ada",
          lastname: "Lovelace",
          username: "ada",
          email: "ada@example.com",
        },
        {
          _id: new ObjectId(guestId),
          name: "Alan Turing",
          username: "alan",
          email: "alan@example.com",
        },
      ]),
    });
  });

  it("returns upcoming sessions with participant labels", async () => {
    const { status, json } = await parseResponse(
      await GET(new Request("http://localhost/api/admin/sessions")),
    );
    expect(status).toBe(200);
    expect(json.total).toBe(1);
    expect(json.sessions).toHaveLength(1);
    expect(json.sessions[0].between).toBe("Ada Lovelace ↔ Alan Turing");
    expect(json.sessions[0].durationMin).toBe(50);
    expect(json.sessions[0].participants).toHaveLength(2);
    expect(json.sessions[0].startTime).toBe("2026-08-18T10:00:00.000Z");
  });

  it("returns done sessions with completion flags", async () => {
    sessionsCol.find.mockReturnValue(
      fluentFind([
        {
          _id: new ObjectId(),
          owner_id: hostId,
          start_time: new Date("2026-08-01T10:00:00.000Z"),
          end_time: new Date("2026-08-01T10:50:00.000Z"),
          duration_min: 50,
          session_type: "focus",
          session_participants: [
            {
              user_id: hostId,
              call_joined_at: new Date("2026-08-01T10:00:00.000Z"),
              call_completed: true,
            },
            {
              user_id: guestId,
              call_joined_at: new Date("2026-08-01T10:00:00.000Z"),
              call_completed: false,
            },
          ],
        },
      ]),
    );
    const { status, json } = await parseResponse(
      await GET(
        new Request("http://localhost/api/admin/sessions?scope=done"),
      ),
    );
    expect(status).toBe(200);
    expect(json.scope).toBe("done");
    expect(json.sessions[0].completion).toBe("partial");
    expect(json.sessions[0].completedCount).toBe(1);
    expect(json.sessions[0].participants[0].completed).toBe(true);
    expect(json.sessions[0].participants[1].completed).toBe(false);
  });
});
