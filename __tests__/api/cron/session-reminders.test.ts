import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { parseResponse } from "../../helpers";

const mocks = vi.hoisted(() => ({
  runTimedSessionReminders: vi.fn(),
}));

vi.mock("@/lib/sessionReminderJobs", () => ({
  runTimedSessionReminders: mocks.runTimedSessionReminders,
}));

import { GET } from "@/app/api/cron/session-reminders/route";

describe("GET /api/cron/session-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    mocks.runTimedSessionReminders.mockResolvedValue({
      kind: "1h",
      recipients: 0,
      sent: 0,
      skipped: 0,
      failed: 0,
    });
  });

  it("returns 401 without cron secret", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/cron/session-reminders"));
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(401);
  });

  it("runs timed reminder jobs with valid secret", async () => {
    const req = new NextRequest(new URL("http://localhost:3000/api/cron/session-reminders"), {
      headers: { authorization: "Bearer test-cron-secret" },
    });
    const { status, json } = await parseResponse(await GET(req));

    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(mocks.runTimedSessionReminders).toHaveBeenCalledWith("1h");
    expect(mocks.runTimedSessionReminders).toHaveBeenCalledWith("10m");
  });
});
