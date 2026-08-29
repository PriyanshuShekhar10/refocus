import { describe, it, expect } from "vitest";
import {
  computeInactiveDays,
  countCompliantDays,
  getQualifyingEventForMember,
  isSessionMatched,
  type QualifyingSessionDoc,
} from "@/lib/crewQualifying";

const ownerId = "owner-1";
const joinerId = "joiner-1";
const deleted = new Set(["deleted-session"]);

function session(
  partial: Partial<QualifyingSessionDoc> & Pick<QualifyingSessionDoc, "id">,
): QualifyingSessionDoc {
  return {
    owner_id: ownerId,
    created_at: new Date("2026-08-21T08:00:00+05:30"),
    participant_count: 1,
    session_participants: [{ user_id: ownerId }],
    ...partial,
  };
}

describe("crewQualifying", () => {
  it("detects matched sessions", () => {
    expect(isSessionMatched({ participant_count: 2 })).toBe(true);
    expect(
      isSessionMatched({
        session_participants: [{ user_id: "a" }, { user_id: "b" }],
      }),
    ).toBe(true);
    expect(isSessionMatched({ participant_count: 1 })).toBe(false);
  });

  it("prefers participant rows over stale participant_count", () => {
    expect(
      isSessionMatched({
        participant_count: 2,
        session_participants: [{ user_id: ownerId }],
      }),
    ).toBe(false);
    expect(
      getQualifyingEventForMember(
        session({
          id: "stale-count",
          participant_count: 2,
          session_participants: [{ user_id: ownerId }],
        }),
        ownerId,
        deleted,
      ),
    ).toEqual({ dateKey: "2026-08-21" });
  });

  it("counts owner unmatched create on created_at day", () => {
    const s = session({ id: "s1" });
    expect(getQualifyingEventForMember(s, ownerId, deleted)).toEqual({
      dateKey: "2026-08-21",
    });
  });

  it("counts owner matched join on call_joined_at day", () => {
    const s = session({
      id: "s2",
      participant_count: 2,
      session_participants: [
        {
          user_id: ownerId,
          call_joined_at: new Date("2026-08-22T09:00:00+05:30"),
        },
        { user_id: joinerId },
      ],
    });
    expect(getQualifyingEventForMember(s, ownerId, deleted)).toEqual({
      dateKey: "2026-08-22",
    });
  });

  it("does not count owner matched without call join", () => {
    const s = session({
      id: "s3",
      participant_count: 2,
      session_participants: [{ user_id: ownerId }, { user_id: joinerId }],
    });
    expect(getQualifyingEventForMember(s, ownerId, deleted)).toBeNull();
  });

  it("counts non-owner join on joined_at day", () => {
    const s = session({
      id: "s4",
      participant_count: 2,
      session_participants: [
        { user_id: ownerId },
        {
          user_id: joinerId,
          joined_at: new Date("2026-08-20T10:00:00+05:30"),
        },
      ],
    });
    expect(getQualifyingEventForMember(s, joinerId, deleted)).toEqual({
      dateKey: "2026-08-20",
    });
  });

  it("excludes deleted sessions", () => {
    const s = session({ id: "deleted-session" });
    expect(getQualifyingEventForMember(s, ownerId, deleted)).toBeNull();
  });

  it("counts compliant days in range", () => {
    expect(
      countCompliantDays([
        { date: "2026-08-19", qualifying: 2 },
        { date: "2026-08-20", qualifying: 3 },
        { date: "2026-08-21", qualifying: 5 },
      ]),
    ).toBe(2);
  });

  it("returns 0 inactive days when today is compliant", () => {
    expect(
      computeInactiveDays(
        [
          { date: "2026-08-19", qualifying: 1 },
          { date: "2026-08-20", qualifying: 3 },
          { date: "2026-08-21", qualifying: 4 },
        ],
        "2026-08-21",
      ),
    ).toBe(0);
  });

  it("computes continuous inactive streak through today", () => {
    expect(
      computeInactiveDays(
        [
          { date: "2026-08-16", qualifying: 3 },
          { date: "2026-08-17", qualifying: 1 },
          { date: "2026-08-18", qualifying: 0 },
          { date: "2026-08-19", qualifying: 2 },
          { date: "2026-08-20", qualifying: 1 },
          { date: "2026-08-21", qualifying: 2 },
        ],
        "2026-08-21",
      ),
    ).toBe(5);
  });

  it("does not count days before first activity when never compliant", () => {
    expect(
      computeInactiveDays(
        [
          { date: "2026-08-19", qualifying: 0 },
          { date: "2026-08-20", qualifying: 0 },
          { date: "2026-08-21", qualifying: 0 },
        ],
        "2026-08-21",
        "2026-01-01",
        "2026-08-19",
      ),
    ).toBe(3);
  });
});
