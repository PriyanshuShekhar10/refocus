import type { DailyDeviceError } from "@/app/(product)/components/MediaPermissionHelp";

/** Join details from POST /api/sessions/[id]/video/token. */
export type VideoJoin = {
  provider: "daily";
  token: string;
  roomName: string;
  domain: string;
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
  startMuted: boolean;
  isDark: boolean;
  onLeft(): void;
  onDeviceError(error: VideoDeviceError): void;
  onCameraStarted(): void;
};
