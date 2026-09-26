import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { parseResponse } from "../../helpers";

const mocks = vi.hoisted(() => ({
  runPushJoinReminders: vi.fn(),
}));

vi.mock("@/lib/push/joinReminders", () => ({
  runPushJoinReminders: mocks.runPushJoinReminders,
}));

import { GET } from "@/app/api/cron/push-join-reminders/route";

describe("GET /api/cron/push-join-reminders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("CRON_SECRET", "test-cron-secret");
    mocks.runPushJoinReminders.mockResolvedValue({
      recipients: 1,
      sent: 1,
      skipped: 0,
      failed: 0,
    });
  });

  it("returns 401 without cron secret", async () => {
    const req = new NextRequest(
      new URL("http://localhost:3000/api/cron/push-join-reminders"),
    );
    const { status } = await parseResponse(await GET(req));
    expect(status).toBe(401);
  });

  it("runs the join reminder job", async () => {
    const req = new NextRequest(
      new URL("http://localhost:3000/api/cron/push-join-reminders"),
      { headers: { authorization: "Bearer test-cron-secret" } },
    );
    const { status, json } = await parseResponse(await GET(req));
    expect(status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.result.sent).toBe(1);
    expect(mocks.runPushJoinReminders).toHaveBeenCalledOnce();
  });
});
