import type { VideoProvider } from "../types";
import { ensureStreamChatChannel } from "./chat";
import { getStreamServerClient } from "./client";

/** Calls are capped at 480p — see the plan's "480p cap" note for why this is the authoritative side of it. */
const TARGET_RESOLUTION = { width: 640, height: 480 };
const CALL_TYPE = "default";

/**
 * Stream's "default" call type defaults camera/mic to on and re-applies that
 * on every reconnect (network blip, tab backgrounding, SFU migration) —
 * silently turning a manually-muted device back on. Force both off here so
 * only StreamStage's own explicit enable/disable calls control device state.
 */
// `settings_override.video` fully replaces the call type's video settings
// object rather than merging into it — omitting `enabled` here previously
// left it unset, which silently dropped SEND_VIDEO from everyone's
// own_capabilities for this call (confirmed against the live API).
const SETTINGS_OVERRIDE = {
  video: { enabled: true, camera_default_on: false, target_resolution: TARGET_RESOLUTION },
  audio: { mic_default_on: false, default_device: "speaker" as const },
};

/** Stream Video adapter. No room/call expiry handling yet (see plan's known limitation). */
export const streamVideoProvider: VideoProvider = {
  id: "stream",
  async issueJoin({ sessionId, userId, userName, tokenExpiresAt }) {
    const client = getStreamServerClient();
    const callId = `session-${sessionId}`;

    // Keep the participant's display name fresh on Stream's side rather than
    // trusting a client-carried value (see commit 05b2472's stale-name fix).
    await client.upsertUsers([{ id: userId, name: userName ?? undefined }]);

    const call = client.video.call(CALL_TYPE, callId);
    await call.getOrCreate({
      data: {
        created_by_id: userId,
        settings_override: SETTINGS_OVERRIDE,
      },
    });
    // Reapply unconditionally so a call created before these overrides
    // existed (or without them, from an earlier local run) still gets them.
    await call.update({ settings_override: SETTINGS_OVERRIDE });
    // getOrCreate's `data.members` doesn't reliably apply (confirmed against
    // the live API) — add membership explicitly on every join instead.
    // Without "user"-role membership, SEND_VIDEO/SEND_AUDIO/SCREENSHARE
    // aren't granted and camera.enable() fails with a permission error.
    await call.updateCallMembers({ update_members: [{ user_id: userId, role: "user" }] });

    const chat = await ensureStreamChatChannel(client, sessionId, userId);

    const token = client.generateUserToken({ user_id: userId, exp: tokenExpiresAt });

    return { provider: "stream", token, roomName: callId, domain: CALL_TYPE, chat };
  },
};
