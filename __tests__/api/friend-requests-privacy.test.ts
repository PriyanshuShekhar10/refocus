import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockRequest, parseResponse, mockCollection, mockDb, mockSession } from "../helpers";

const ME = new ObjectId();
const TARGET = new ObjectId();

const friendRequests = mockCollection();
const users = mockCollection();
const db = mockDb({ friend_requests: friendRequests, users });
vi.mock("@/lib/mongodb", () => ({ getDb: vi.fn().mockImplementation(() => Promise.resolve(db)) }));

import { GET } from "@/app/api/friends/requests/route";

describe("GET /api/friends/requests privacy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSession(String(ME));
    const reqDoc = {
      _id: new ObjectId(),
      from_user_id: String(ME),
      to_user_id: String(TARGET),
      status: "pending",
      created_at: new Date(),
    };
    const sorted = { toArray: vi.fn().mockResolvedValue([reqDoc]) };
    friendRequests.find.mockReturnValue({ sort: vi.fn().mockReturnValue(sorted), toArray: sorted.toArray });
    users.find.mockReturnValue({
      project: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          { _id: TARGET, email: "secret@example.com", firstname: "Maya", lastname: "Chen", username: "mayac" },
        ]),
      }),
    });
  });

  it("returns the other person's name but never their email", async () => {
    const { status, json } = await parseResponse(
      await GET(mockRequest("/api/friends/requests?type=outgoing")),
    );
    expect(status).toBe(200);
    expect(JSON.stringify(json)).not.toContain("secret@example.com");
    expect(json.requests[0].to_user_name).toBe("Maya Chen");
  });
});
