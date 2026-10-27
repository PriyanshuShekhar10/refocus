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
  startMuted: boolean;
  isDark: boolean;
  /** Only Stream uses these — chat panel open state, toggled from the header. */
  chatOpen: boolean;
  onCloseChat(): void;
  onLeft(): void;
  onDeviceError(error: VideoDeviceError): void;
  onCameraStarted(): void;
};
