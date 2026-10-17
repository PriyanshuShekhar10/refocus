import { describe, it, expect, vi } from "vitest";

vi.mock("@/lib/push/notify", () => ({ notifySessionRequestPush: vi.fn() }));

import { createSessionRequest } from "@/lib/sessionRequests";

describe("createSessionRequest duration", () => {
  it.each([25, 75, 17])("refuses %i-minute requests before touching the database", async (durationMin) => {
    const db = { collection: vi.fn() };
    await expect(
      createSessionRequest({
        db: db as never,
        currentUserId: "aaaaaaaaaaaaaaaaaaaaaaaa",
        friendId: "bbbbbbbbbbbbbbbbbbbbbbbb",
        start: new Date(Date.now() + 864e5).toISOString(),
        durationMin,
      }),
    ).rejects.toThrow("Sessions are 50 minutes long. Please book a 50-minute session.");
    expect(db.collection).not.toHaveBeenCalled();
  });
});
