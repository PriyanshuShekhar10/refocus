import type { DailyDeviceError } from "@/app/(product)/components/MediaPermissionHelp";

/** Join details from POST /api/sessions/[id]/video/token. */
export type VideoJoin = {
  provider: "daily" | "stream";
  token: string;
  roomName: string;
  domain: string;
  /** Stream-only: an inbuilt chat channel alongside the call. */
  chat?: { channelType: string; channelId: string };
};

export type VideoDeviceError = DailyDeviceError;

/** Controls the session screen needs from whichever video provider is embedded. */
export type VideoStageHandle = {
  setMicEnabled(enabled: boolean): void;
  leave(): void;
  /** Re-acquire the camera after a device error (e.g. permission granted). */
  retryCamera(): Promise<void>;
};

export type VideoStageProps = {
  join: VideoJoin;
  /** The joining user's id. Only Stream needs this (Daily's token already encodes identity). */
  userId: string;
  /** Only Stream needs this — lets it refetch a fresh token when the one it joined with expires. */
  sessionId: string;
  /**
   * Daily-only: encoded into the iframe URL (`startAudioOff`) before join.
   * Stream ignores this prop — its call type already forces mic off by
   * default for every participant via settings_override (see
   * lib/providers/video/stream/index.ts's SETTINGS_OVERRIDE), quiet mode or
   * not, so there's nothing provider-specific left for Stream to do with it.
   * Kept here only so this doesn't become a silent landmine if that
   * server-side default ever changes.
   */
  startMuted: boolean;
  isDark: boolean;
  /** Only Stream uses these — chat panel open state, toggled from the header. */
  chatOpen: boolean;
  onCloseChat(): void;
  onLeft(): void;
  onDeviceError(error: VideoDeviceError): void;
  onCameraStarted(): void;
  /** Only Stream uses this — mirrors the call's real mic state regardless of which control changed it. */
  onMicStateChange?(enabled: boolean): void;
  /** Only Stream uses this — the SFU join itself (not just device acquisition) failed. */
  onJoinFailed?(message?: string): void;
  /** Only Stream uses this — an unread chat message arrived while the panel was closed. */
  onUnreadChatChange?(hasUnread: boolean): void;
};
