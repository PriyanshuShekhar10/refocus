import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../helpers";

const sessionsCol = mockCollection();
const lifecycleCol = mockCollection();
const db = mockDb({
  sessions: sessionsCol,
  session_lifecycle_events: lifecycleCol,
});

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockImplementation(() => Promise.resolve(db)),
}));

const resolveEngagementCrewMembers = vi.hoisted(() => vi.fn());

vi.mock("@/lib/engagementCrew", () => ({
  resolveEngagementCrewMembers,
}));

import {
  clearCrewStatsCache,
  getCrewStats,
} from "@/lib/crewStats";

function findToArray(docs: unknown[]) {
  return {
    toArray: vi.fn().mockResolvedValue(docs),
  };
}

describe("crewStats", () => {
  const userId = String(new ObjectId());
  const now = new Date("2026-08-21T12:00:00+05:30");

  beforeEach(() => {
    vi.clearAllMocks();
    clearCrewStatsCache();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    resolveEngagementCrewMembers.mockResolvedValue([
      {
        email: "hire@example.com",
        canonicalEmail: "hire@example.com",
        userId,
        name: "Hire",
      },
      {
        email: "pending@example.com",
        canonicalEmail: "pending@example.com",
        userId: null,
        name: null,
      },
    ]);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("aggregates created/deleted/joined/attended/finished and qualifying for today", async () => {
    const today = new Date("2026-08-21T08:00:00+05:30");
    sessionsCol.find.mockReturnValueOnce(
      findToArray([
        { _id: "c1", owner_id: userId, created_at: today, participant_count: 1 },
        { _id: "c2", owner_id: userId, created_at: today, participant_count: 1 },
        {
          _id: "j1",
          owner_id: "someone-else",
          end_time: today,
          session_participants: [
            {
              user_id: userId,
              joined_at: today,
              call_joined_at: today,
              call_left_at: today,
              call_completed: true,
            },
          ],
        },
      ]),
    );
    lifecycleCol.find.mockReturnValue(
      findToArray([{ userId, at: today }]),
    );

    const stats = await getCrewStats(7);
    expect(stats.days).toBe(7);
    expect(stats.todayKey).toBe("2026-08-21");
    expect(stats.fromKey).toBe("2026-08-15");
    expect(stats.toKey).toBe("2026-08-21");
    expect(stats.members).toHaveLength(2);

    const hire = stats.members.find((m) => m.email === "hire@example.com");
    expect(hire?.today).toMatchObject({
      date: "2026-08-21",
      created: 2,
      deleted: 1,
      joined: 1,
      attended: 1,
      finished: 1,
      qualifying: 3,
    });
    expect(hire?.inactiveDays).toBe(0);
    expect(hire?.days).toHaveLength(7);

    const pending = stats.members.find(
      (m) => m.email === "pending@example.com",
    );
    expect(pending?.today.created).toBe(0);
    expect(pending?.inactiveDays).toBe(0);
    expect(pending?.userId).toBeNull();
  });

  it("computes inactive streak when today is below 3 qualifying sessions", async () => {
    const today = new Date("2026-08-21T08:00:00+05:30");
    const compliantDay = new Date("2026-08-19T08:00:00+05:30");
    sessionsCol.find.mockReturnValueOnce(
      findToArray([
        {
          _id: "old1",
          owner_id: userId,
          created_at: compliantDay,
          participant_count: 1,
        },
        {
          _id: "old2",
          owner_id: userId,
          created_at: compliantDay,
          participant_count: 1,
        },
        {
          _id: "old3",
          owner_id: userId,
          created_at: compliantDay,
          participant_count: 1,
        },
        {
          _id: "today1",
          owner_id: userId,
          created_at: today,
          participant_count: 1,
        },
      ]),
    );
    lifecycleCol.find.mockReturnValue(findToArray([]));

    const stats = await getCrewStats(7);
    const hire = stats.members.find((m) => m.email === "hire@example.com");
    expect(hire?.today.qualifying).toBe(1);
    expect(hire?.inactiveDays).toBe(2);
  });

  it("clamps days between 1 and 90", async () => {
    sessionsCol.find.mockReturnValue(findToArray([]));
    lifecycleCol.find.mockReturnValue(findToArray([]));
    const low = await getCrewStats(0);
    expect(low.days).toBe(1);
    const high = await getCrewStats(999);
    expect(high.days).toBe(90);
  });
});
