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

const streamCall = {
  getOrCreate: vi.fn(async () => ({})),
  update: vi.fn(async () => ({})),
  updateCallMembers: vi.fn(async () => ({})),
};
const streamChannel = {
  getOrCreate: vi.fn(async () => ({})),
  update: vi.fn(async () => ({})),
};
const streamClient = {
  upsertUsers: vi.fn(async () => ({})),
  video: { call: vi.fn(() => streamCall) },
  chat: { channel: vi.fn(() => streamChannel) },
  generateUserToken: vi.fn(({ user_id }: { user_id: string }) => `tok-${user_id}`),
};
vi.mock("@/lib/providers/video/stream/client", () => ({
  getStreamServerClient: vi.fn(() => streamClient),
}));

import { createDailyMeetingToken, createOrGetDailyRoom } from "@/lib/providers/video/daily/rooms";
import { dailyVideoProvider } from "@/lib/providers/video/daily";
import { streamVideoProvider } from "@/lib/providers/video/stream";
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
runVideoProviderContract("stream", () => streamVideoProvider);

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

describe("stream adapter specifics", () => {
  it("upserts the user's name and caps the call at 480p", async () => {
    streamClient.upsertUsers.mockClear();
    streamClient.video.call.mockClear();
    streamCall.getOrCreate.mockClear();
    streamCall.update.mockClear();
    streamClient.generateUserToken.mockClear();

    await streamVideoProvider.issueJoin({
      sessionId: "dddddddddddddddddddddddd",
      userId: "u1",
      userName: "Ravi",
      roomExpiresAt: 111,
      tokenExpiresAt: 99,
    });

    const expectedSettingsOverride = {
      video: { enabled: true, camera_default_on: false, target_resolution: { width: 640, height: 480 } },
      audio: { mic_default_on: false, default_device: "speaker" },
    };

    expect(streamClient.upsertUsers).toHaveBeenCalledWith([{ id: "u1", name: "Ravi" }]);
    expect(streamClient.video.call).toHaveBeenCalledWith("default", "session-dddddddddddddddddddddddd");
    expect(streamCall.getOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ settings_override: expectedSettingsOverride }),
      }),
    );
    expect(streamCall.update).toHaveBeenCalledWith({ settings_override: expectedSettingsOverride });
    expect(streamCall.updateCallMembers).toHaveBeenCalledWith({
      update_members: [{ user_id: "u1", role: "user" }],
    });
    expect(streamClient.generateUserToken).toHaveBeenCalledWith({ user_id: "u1", exp: 99 });
  });

  it("creates/joins a chat channel alongside the call", async () => {
    streamClient.chat.channel.mockClear();
    streamChannel.getOrCreate.mockClear();
    streamChannel.update.mockClear();

    const join = await streamVideoProvider.issueJoin({
      sessionId: "eeeeeeeeeeeeeeeeeeeeeeee",
      userId: "u1",
      userName: "Ravi",
      roomExpiresAt: 111,
      tokenExpiresAt: 99,
    });

    expect(streamClient.chat.channel).toHaveBeenCalledWith("messaging", "session-eeeeeeeeeeeeeeeeeeeeeeee");
    expect(streamChannel.getOrCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ created_by_id: "u1", members: [{ user_id: "u1" }] }),
      }),
    );
    expect(streamChannel.update).toHaveBeenCalledWith({ add_members: [{ user_id: "u1" }] });
    expect(join.chat).toEqual({ channelType: "messaging", channelId: "session-eeeeeeeeeeeeeeeeeeeeeeee" });
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
