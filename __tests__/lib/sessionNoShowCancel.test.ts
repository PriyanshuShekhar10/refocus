import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../helpers";

const sessionsCol = mockCollection();
const usersCol = mockCollection();
const eventsCol = mockCollection();
const db = mockDb({
  sessions: sessionsCol,
  users: usersCol,
  session_no_show_events: eventsCol,
});

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

vi.mock("@/lib/sessionLifecycleEvents", () => ({
  logSessionDeleted: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/email/sendNoShowEmails", () => ({
  sendNoShowDayCancelledEmail: vi.fn().mockResolvedValue({ sent: true }),
  sendPartnerRemovedForInactivityEmail: vi
    .fn()
    .mockResolvedValue({ sent: true }),
}));

import { runSessionNoShowCancellations } from "@/lib/sessionNoShowCancel";
import {
  sendNoShowDayCancelledEmail,
  sendPartnerRemovedForInactivityEmail,
} from "@/lib/email/sendNoShowEmails";

const USER_X = new ObjectId().toHexString();
const USER_Y = new ObjectId().toHexString();

describe("runSessionNoShowCancellations", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    eventsCol.createIndex.mockResolvedValue("idx");
    eventsCol.insertOne.mockResolvedValue({ insertedId: new ObjectId() });
    sessionsCol.find.mockReturnValue({
      sort: vi.fn().mockReturnValue({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([]),
        }),
      }),
      limit: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([]),
      }),
      toArray: vi.fn().mockResolvedValue([]),
    });
    usersCol.findOne.mockResolvedValue({
      _id: new ObjectId(USER_X),
      email: "x@example.com",
      firstname: "X",
      preferences: { timezone: "Asia/Kolkata" },
    });
  });

  it("does nothing when no ended booked sessions", async () => {
    const result = await runSessionNoShowCancellations({
      db: db as never,
      now: new Date(),
      lookbackMinutes: 90,
    });
    expect(result.missesDetected).toBe(0);
    expect(result.dayWipes).toBe(0);
    expect(sendNoShowDayCancelledEmail).not.toHaveBeenCalled();
  });

  it("ignores solo unmatched ended sessions", async () => {
    const now = new Date();
    const endedSolo = {
      _id: new ObjectId(),
      owner_id: USER_X,
      start_time: new Date(now.getTime() - 50 * 60_000),
      end_time: new Date(now.getTime() - 5 * 60_000),
      duration_min: 50,
      session_type: "focus",
      participant_count: 1,
      session_participants: [{ user_id: USER_X, joined_at: new Date() }],
    };
    sessionsCol.find.mockReturnValueOnce({
      limit: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([endedSolo]),
      }),
    });

    const result = await runSessionNoShowCancellations({
      db: db as never,
      now,
      lookbackMinutes: 90,
    });
    expect(result.missesDetected).toBe(0);
  });

  it("detects miss, wipes remaining day sessions, emails X and partner Y", async () => {
    const now = new Date("2026-09-13T12:00:00+05:30");
    const missedId = new ObjectId();
    const remainingId = new ObjectId();

    const missed = {
      _id: missedId,
      owner_id: USER_Y,
      start_time: new Date("2026-09-13T10:00:00+05:30"),
      end_time: new Date("2026-09-13T10:50:00+05:30"),
      duration_min: 50,
      session_type: "focus",
      participant_count: 2,
      session_participants: [
        { user_id: USER_Y, joined_at: new Date(), call_joined_at: new Date() },
        { user_id: USER_X, joined_at: new Date() }, // no call_joined_at
      ],
    };

    const remaining = {
      _id: remainingId,
      owner_id: USER_X,
      start_time: new Date("2026-09-13T15:00:00+05:30"),
      end_time: new Date("2026-09-13T15:50:00+05:30"),
      duration_min: 50,
      session_type: "focus",
      participant_count: 2,
      session_participants: [
        { user_id: USER_X, joined_at: new Date() },
        { user_id: USER_Y, joined_at: new Date() },
      ],
    };

    // First find: ended booked; second find: remaining that day
    sessionsCol.find
      .mockReturnValueOnce({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([missed]),
        }),
      })
      .mockReturnValueOnce({
        limit: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue([remaining]),
        }),
      });

    usersCol.findOne
      .mockResolvedValueOnce({
        _id: new ObjectId(USER_X),
        email: "x@example.com",
        firstname: "Xena",
        preferences: { timezone: "Asia/Kolkata" },
      })
      .mockResolvedValueOnce({
        _id: new ObjectId(USER_Y),
        email: "y@example.com",
        firstname: "Yuri",
        preferences: { timezone: "Asia/Kolkata" },
      });

    // After transfer, findOne returns updated session
    sessionsCol.findOne.mockResolvedValue({
      ...remaining,
      owner_id: USER_Y,
      participant_count: 1,
      session_participants: [{ user_id: USER_Y, joined_at: new Date() }],
      status: "available",
    });

    const result = await runSessionNoShowCancellations({
      db: db as never,
      now,
      lookbackMinutes: 90,
    });

    expect(result.missesDetected).toBe(1);
    expect(result.dayWipes).toBe(1);
    expect(result.sessionsAffected).toBe(1);
    expect(sendNoShowDayCancelledEmail).toHaveBeenCalled();
    expect(sendPartnerRemovedForInactivityEmail).toHaveBeenCalled();
    expect(sessionsCol.updateOne).toHaveBeenCalled();
  });

  it("skips day wipe when already processed (duplicate key)", async () => {
    const now = new Date("2026-09-13T12:00:00+05:30");
    const missed = {
      _id: new ObjectId(),
      owner_id: USER_Y,
      start_time: new Date("2026-09-13T10:00:00+05:30"),
      end_time: new Date("2026-09-13T10:50:00+05:30"),
      duration_min: 50,
      participant_count: 2,
      session_participants: [
        { user_id: USER_Y, call_joined_at: new Date() },
        { user_id: USER_X },
      ],
    };

    sessionsCol.find.mockReturnValueOnce({
      limit: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([missed]),
      }),
    });

    // First insert (miss) ok; second (day_wipe) duplicate
    eventsCol.insertOne
      .mockResolvedValueOnce({ insertedId: new ObjectId() })
      .mockRejectedValueOnce({ code: 11000 });

    const result = await runSessionNoShowCancellations({
      db: db as never,
      now,
      lookbackMinutes: 90,
    });

    expect(result.missesDetected).toBe(1);
    expect(result.dayWipes).toBe(0);
    expect(sendNoShowDayCancelledEmail).not.toHaveBeenCalled();
  });
});
