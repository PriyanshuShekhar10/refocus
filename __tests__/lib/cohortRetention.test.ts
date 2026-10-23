import { describe, it, expect } from "vitest";
import { mondayKey, computeCohortRetention } from "@/lib/cohortRetention";

describe("mondayKey", () => {
  it("resolves to the Monday of the IST calendar week", () => {
    // Saturday 24 Oct 2026, 02:00 UTC = 07:30 IST, still Saturday in IST.
    expect(mondayKey(new Date("2026-10-24T02:00:00.000Z"))).toBe("2026-10-19");
  });

  it("a UTC timestamp just before midnight IST still lands on the next IST day", () => {
    // 2026-10-18T19:00:00Z = 2026-10-19T00:30 IST -> Monday itself.
    expect(mondayKey(new Date("2026-10-18T19:00:00.000Z"))).toBe("2026-10-19");
    // 2026-10-18T18:00:00Z = 2026-10-18T23:30 IST -> still Sunday, prior week.
    expect(mondayKey(new Date("2026-10-18T18:00:00.000Z"))).toBe("2026-10-12");
  });
});

describe("computeCohortRetention", () => {
  const cohortMonday = new Date("2026-08-17T10:00:00+05:30");
  const now = new Date("2026-10-24T12:00:00+05:30"); // within week index 9's cohort span

  it("buckets booked / joined-call and weekly retention", () => {
    const users = [
      { id: "u1", createdAt: cohortMonday },
      { id: "u2", createdAt: cohortMonday },
      { id: "u3", createdAt: cohortMonday },
    ];
    const touches = new Map([
      ["u1", [{ partnered: true, callJoinedAt: new Date("2026-08-18T10:00:00+05:30") }]],
      ["u2", [{ partnered: true, callJoinedAt: null }]],
      ["u3", []],
    ]);

    const rows = computeCohortRetention(users, touches, now);
    expect(rows).toHaveLength(1);
    const row = rows[0];
    expect(row.cohort).toBe("2026-08-17");
    expect(row.size).toBe(3);
    expect(row.booked).toBe(2); // u1, u2 had a partnered session
    expect(row.joinedCall).toBe(1); // only u1 ever joined a call
    expect(row.weeks[0]).toMatchObject({ week: 0, active: 1, rate: 0.3333 });
  });

  it("marks only the most recent week as partial", () => {
    const users = [{ id: "u1", createdAt: cohortMonday }];
    const rows = computeCohortRetention(users, new Map(), now);
    const weeks = rows[0].weeks;
    expect(weeks.every((w) => !w.partial)).toBe(false);
    expect(weeks.at(-1)!.partial).toBe(true);
    expect(weeks.slice(0, -1).every((w) => !w.partial)).toBe(true);
  });

  it("drops cohorts smaller than minCohortSize", () => {
    const users = [{ id: "u1", createdAt: cohortMonday }];
    expect(computeCohortRetention(users, new Map(), now, { minCohortSize: 10 })).toHaveLength(0);
    expect(computeCohortRetention(users, new Map(), now, { minCohortSize: 1 })).toHaveLength(1);
  });
});
