import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../helpers";

const logSessionDeleted = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const publishSessionDocUpserted = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined),
);
const publishSessionRemoved = vi.hoisted(() =>
  vi.fn().mockResolvedValue(undefined),
);

vi.mock("@/lib/sessionLifecycleEvents", () => ({
  logSessionDeleted,
}));

vi.mock("@/lib/sessionRealtime", () => ({
  publishSessionDocUpserted,
  publishSessionRemoved,
}));

const sessionsCol = mockCollection();
const db = mockDb({ sessions: sessionsCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

import { removeUserFromOngoingSessions } from "@/lib/removeUserFromOngoingSessions";

describe("removeUserFromOngoingSessions", () => {
  const bannedId = String(new ObjectId());
  const partnerId = String(new ObjectId());
  const now = Date.now();

  beforeEach(() => {
    vi.clearAllMocks();
    sessionsCol.updateOne.mockResolvedValue({ modifiedCount: 1 });
    sessionsCol.deleteOne.mockResolvedValue({ deletedCount: 1 });
  });

  it("transfers matched owned sessions and deletes solo owned slots", async () => {
    const matchedId = new ObjectId();
    const soloId = new ObjectId();
    sessionsCol.find.mockReturnValue({
      limit: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          {
            _id: matchedId,
            owner_id: bannedId,
            start_time: new Date(now + 3600_000),
            end_time: new Date(now + 7200_000),
            duration_min: 50,
            session_type: "focus",
            session_participants: [
              { user_id: bannedId, joined_at: new Date() },
              { user_id: partnerId, joined_at: new Date() },
            ],
          },
          {
            _id: soloId,
            owner_id: bannedId,
            start_time: new Date(now + 3600_000),
            end_time: new Date(now + 7200_000),
            duration_min: 50,
            session_type: "focus",
            session_participants: [
              { user_id: bannedId, joined_at: new Date() },
            ],
          },
        ]),
      }),
    });
    sessionsCol.findOne.mockResolvedValue({
      _id: matchedId,
      owner_id: partnerId,
      start_time: new Date(now + 3600_000),
      end_time: new Date(now + 7200_000),
      duration_min: 50,
      session_type: "focus",
      session_participants: [{ user_id: partnerId, joined_at: new Date() }],
    });

    const result = await removeUserFromOngoingSessions(bannedId);
    expect(result).toEqual({ left: 0, deleted: 1, transferred: 1 });
    expect(sessionsCol.updateOne).toHaveBeenCalled();
    expect(sessionsCol.deleteOne).toHaveBeenCalledWith({ _id: soloId });
    expect(logSessionDeleted).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "transfer" }),
    );
    expect(logSessionDeleted).toHaveBeenCalledWith(
      expect.objectContaining({ kind: "hard" }),
    );
    expect(publishSessionRemoved).toHaveBeenCalledWith(String(soloId));
  });

  it("removes banned user as a non-owner joiner", async () => {
    const sessionId = new ObjectId();
    sessionsCol.find.mockReturnValue({
      limit: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          {
            _id: sessionId,
            owner_id: partnerId,
            start_time: new Date(now + 3600_000),
            end_time: new Date(now + 7200_000),
            duration_min: 50,
            session_type: "focus",
            session_participants: [
              { user_id: partnerId, joined_at: new Date() },
              { user_id: bannedId, joined_at: new Date() },
            ],
          },
        ]),
      }),
    });
    sessionsCol.findOne.mockResolvedValue({
      _id: sessionId,
      owner_id: partnerId,
      start_time: new Date(now + 3600_000),
      end_time: new Date(now + 7200_000),
      duration_min: 50,
      session_type: "focus",
      session_participants: [{ user_id: partnerId, joined_at: new Date() }],
      status: "available",
    });

    const result = await removeUserFromOngoingSessions(bannedId);
    expect(result).toEqual({ left: 1, deleted: 0, transferred: 0 });
    expect(sessionsCol.updateOne).toHaveBeenCalledWith(
      { _id: sessionId },
      expect.objectContaining({
        $set: expect.objectContaining({
          status: "available",
          participant_count: 1,
        }),
      }),
    );
    expect(publishSessionDocUpserted).toHaveBeenCalled();
  });
});
