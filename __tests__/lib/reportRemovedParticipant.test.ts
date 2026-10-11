import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";
import { mockCollection, mockDb } from "../helpers";

vi.mock("@/lib/admin", () => ({ isUserAdmin: vi.fn().mockResolvedValue(false) }));
vi.mock("@/lib/adminAudit", () => ({
  getUserAuditLabel: vi.fn().mockResolvedValue({ email: "x@example.com", label: "Hani" }),
}));

import { resolveReportTarget, ReportValidationError } from "@/lib/reports";

const REPORTER = "aaaaaaaaaaaaaaaaaaaaaaaa";
const REMOVED = "bbbbbbbbbbbbbbbbbbbbbbbb";
const STRANGER = "cccccccccccccccccccccccc";
const SESSION_ID = new ObjectId();

function setup(removedEvent: boolean) {
  const sessions = mockCollection();
  const events = mockCollection();
  const start = new Date(Date.now() - 5 * 60_000);
  // After the no-show cleanup, the session only lists the reporter.
  sessions.findOne.mockResolvedValue({
    _id: SESSION_ID,
    owner_id: REPORTER,
    start_time: start,
    end_time: new Date(start.getTime() + 50 * 60_000),
    duration_min: 50,
    session_participants: [{ user_id: REPORTER }],
  });
  events.findOne.mockImplementation(async (q: { userId?: string }) =>
    removedEvent && q.userId === REMOVED ? { _id: new ObjectId() } : null,
  );
  return mockDb({ sessions, session_lifecycle_events: events });
}

describe("reporting someone removed from the session", () => {
  beforeEach(() => vi.clearAllMocks());

  it("accepts a report against a participant who was removed from this session", async () => {
    const db = setup(true);
    const target = await resolveReportTarget(db as never, REPORTER, "session_call", String(SESSION_ID), REMOVED);
    expect(target.reportedUserId).toBe(REMOVED);
  });

  it("still rejects someone who was never in the session", async () => {
    const db = setup(true);
    await expect(
      resolveReportTarget(db as never, REPORTER, "session_call", String(SESSION_ID), STRANGER),
    ).rejects.toBeInstanceOf(ReportValidationError);
  });

  it("rejects a removed participant when no removal is recorded", async () => {
    const db = setup(false);
    await expect(
      resolveReportTarget(db as never, REPORTER, "session_call", String(SESSION_ID), REMOVED),
    ).rejects.toThrow("Invalid reported user for this session");
  });
});
