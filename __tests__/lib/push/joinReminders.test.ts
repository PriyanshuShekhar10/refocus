import { beforeEach, describe, expect, it, vi } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../../helpers";

const usersCol = mockCollection();
const db = mockDb({ users: usersCol });

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

const findSessionsStartingInRange = vi.fn();
const toReminderItems = vi.fn();

vi.mock("@/lib/sessionReminders", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/sessionReminders")>();
  return {
    ...actual,
    findSessionsStartingInRange: (...args: unknown[]) =>
      findSessionsStartingInRange(...args),
    toReminderItems: (...args: unknown[]) => toReminderItems(...args),
  };
});

const notifySessionReminderPush = vi.fn();
vi.mock("@/lib/push/notify", () => ({
  notifySessionReminderPush: (...args: unknown[]) =>
    notifySessionReminderPush(...args),
}));

import { runPushJoinReminders } from "@/lib/push/joinReminders";

const USER_A = new ObjectId().toString();
const USER_B = new ObjectId().toString();
const SESSION_ID = new ObjectId();

describe("runPushJoinReminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usersCol.find.mockReturnValue({
      project: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          {
            _id: new ObjectId(USER_A),
            firstname: "Ada",
            preferences: {},
          },
          {
            _id: new ObjectId(USER_B),
            firstname: "Maya",
            preferences: {},
          },
        ]),
      }),
    });
    toReminderItems.mockResolvedValue([
      {
        id: String(SESSION_ID),
        partnerLabel: "Maya",
        durationMin: 50,
        startTime: new Date(),
      },
    ]);
    notifySessionReminderPush.mockResolvedValue({
      attempted: 1,
      sent: 1,
      failed: 0,
      skipped: false,
    });
  });

  it("sends for matched sessions in the window", async () => {
    findSessionsStartingInRange.mockResolvedValue([
      {
        _id: SESSION_ID,
        owner_id: USER_A,
        start_time: new Date(Date.now() + 10 * 60 * 1000),
        end_time: new Date(Date.now() + 60 * 60 * 1000),
        duration_min: 50,
        session_type: "focus",
        session_participants: [
          { user_id: USER_A },
          { user_id: USER_B },
        ],
      },
    ]);

    const result = await runPushJoinReminders();
    expect(result.sent).toBe(2);
    expect(notifySessionReminderPush).toHaveBeenCalledTimes(2);
  });

  it("skips unmatched sessions", async () => {
    findSessionsStartingInRange.mockResolvedValue([
      {
        _id: SESSION_ID,
        owner_id: USER_A,
        start_time: new Date(Date.now() + 10 * 60 * 1000),
        end_time: new Date(Date.now() + 60 * 60 * 1000),
        duration_min: 50,
        session_type: "focus",
        session_participants: [{ user_id: USER_A }],
      },
    ]);

    const result = await runPushJoinReminders();
    expect(result.sent).toBe(0);
    expect(notifySessionReminderPush).not.toHaveBeenCalled();
  });

  it("skips opted-out users", async () => {
    usersCol.find.mockReturnValue({
      project: vi.fn().mockReturnValue({
        toArray: vi.fn().mockResolvedValue([
          {
            _id: new ObjectId(USER_A),
            preferences: { pushSessionReminders: false },
          },
          {
            _id: new ObjectId(USER_B),
            preferences: {},
          },
        ]),
      }),
    });
    findSessionsStartingInRange.mockResolvedValue([
      {
        _id: SESSION_ID,
        owner_id: USER_A,
        start_time: new Date(Date.now() + 10 * 60 * 1000),
        end_time: new Date(Date.now() + 60 * 60 * 1000),
        duration_min: 50,
        session_type: "focus",
        session_participants: [
          { user_id: USER_A },
          { user_id: USER_B },
        ],
      },
    ]);

    const result = await runPushJoinReminders();
    expect(notifySessionReminderPush).toHaveBeenCalledTimes(1);
    expect(notifySessionReminderPush.mock.calls[0]?.[0]?.userId).toBe(USER_B);
    expect(result.skipped).toBeGreaterThan(0);
  });
});
