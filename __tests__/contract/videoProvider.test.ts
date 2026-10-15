import { describe, expect, it, vi } from "vitest";
import type { VideoProvider } from "@/lib/providers/video";
import { runVideoProviderContract } from "./videoProvider.contract";

vi.mock("@/lib/providers/video/daily/rooms", () => ({
  createOrGetDailyRoom: vi.fn(async (sessionId: string) => ({
    room: {},
    roomName: `session-${sessionId}`,
    domain: "refocus.daily.co",
    account: { id: "acct-1" },
  })),
  createDailyMeetingToken: vi.fn(async (roomName: string, userId: string) => `tok-${roomName}-${userId}`),
}));

import { createDailyMeetingToken, createOrGetDailyRoom } from "@/lib/providers/video/daily/rooms";
import { dailyVideoProvider } from "@/lib/providers/video/daily";
import { defaultVideoProviderId, getVideoProvider } from "@/lib/providers/video";

/** Minimal in-memory adapter: proves the contract is provider-neutral. */
const fakeProvider: VideoProvider = {
  id: "daily",
  async issueJoin({ sessionId, userId }) {
    return { provider: "daily", token: `fake-${userId}`, roomName: `room-${sessionId}`, domain: "fake.local" };
  },
};

runVideoProviderContract("fake", () => fakeProvider);
runVideoProviderContract("daily", () => dailyVideoProvider);

describe("daily adapter specifics", () => {
  it("passes expiries and the room's account through to Daily unchanged", async () => {
    vi.mocked(createOrGetDailyRoom).mockClear();
    vi.mocked(createDailyMeetingToken).mockClear();
    await dailyVideoProvider.issueJoin({
      sessionId: "cccccccccccccccccccccccc",
      userId: "u1",
      userName: "Ravi",
      roomExpiresAt: 111,
      tokenExpiresAt: 99,
    });
    expect(createOrGetDailyRoom).toHaveBeenCalledWith("cccccccccccccccccccccccc", 111);
    expect(createDailyMeetingToken).toHaveBeenCalledWith("session-cccccccccccccccccccccccc", "u1", {
      userName: "Ravi",
      exp: 99,
      account: { id: "acct-1" },
    });
  });
});

describe("provider selection", () => {
  it("defaults to daily and ignores unknown VIDEO_PROVIDER values", () => {
    const prev = process.env.VIDEO_PROVIDER;
    process.env.VIDEO_PROVIDER = "not-a-provider";
    expect(defaultVideoProviderId()).toBe("daily");
    delete process.env.VIDEO_PROVIDER;
    expect(getVideoProvider().id).toBe("daily");
    if (prev === undefined) delete process.env.VIDEO_PROVIDER;
    else process.env.VIDEO_PROVIDER = prev;
  });
});
