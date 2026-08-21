import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb, mockRequest, parseResponse } from "../../helpers";

const resolveEngagementCrewMembers = vi.hoisted(() => vi.fn());

vi.mock("@/lib/engagementCrew", () => ({
  resolveEngagementCrewMembers,
}));

const sessionsCol = mockCollection();
const usersCol = mockCollection();
const db = mockDb({ sessions: sessionsCol, users: usersCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

import { GET } from "@/app/api/crew/sessions/route";

describe("/api/crew/sessions", () => {
  const userId = String(new ObjectId());
  const partnerId = String(new ObjectId());

  beforeEach(() => {
    vi.clearAllMocks();
    resolveEngagementCrewMembers.mockResolvedValue([
      {
        email: "hire@example.com",
        canonicalEmail: "hire@example.com",
        userId,
        name: "Hire",
      },
    ]);
    sessionsCol.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([
            {
              _id: new ObjectId(),
              owner_id: userId,
              start_time: new Date("2026-08-20T10:00:00+05:30"),
              end_time: new Date("2026-08-20T10:50:00+05:30"),
              duration_min: 50,
              session_type: "focus",
              status: "booked",
              session_participants: [
                {
                  user_id: userId,
                  call_joined_at: new Date("2026-08-20T10:01:00+05:30"),
                  call_completed: true,
                },
                { user_id: partnerId },
              ],
            },
          ]),
        }),
      }),
    });
    usersCol.find.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([
        {
          _id: new ObjectId(partnerId),
          firstname: "Pat",
          lastname: "Ner",
        },
      ]),
    });
  });

  it("requires email", async () => {
    const req = mockRequest("/api/crew/sessions", { method: "GET" });
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(400);
  });

  it("returns sessions for a crew member", async () => {
    const req = mockRequest(
      "/api/crew/sessions?email=hire@example.com",
      { method: "GET" },
    );
    const { status, json } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(json.userId).toBe(userId);
    expect(json.sessions).toHaveLength(1);
    expect(json.sessions[0].role).toBe("created");
    expect(json.sessions[0].status).toBe("finished");
    expect(json.sessions[0].partner).toBe("Pat Ner");
  });

  it("returns empty for non-crew email", async () => {
    resolveEngagementCrewMembers.mockResolvedValue([]);
    const req = mockRequest(
      "/api/crew/sessions?email=stranger@example.com",
      { method: "GET" },
    );
    const { status, json } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(json.sessions).toEqual([]);
  });
});
