/**
 * Video provider interface. Everything outside lib/providers/video talks to
 * this, never to a vendor SDK, so swapping providers means adding one adapter.
 */

export type VideoProviderId = "daily";

export const VIDEO_PROVIDER_IDS: readonly VideoProviderId[] = ["daily"];

/** What a client needs to join a session's call. Sent as-is to the browser and the app. */
export type VideoJoin = {
  provider: VideoProviderId;
  token: string;
  roomName: string;
  /** Provider host the client connects to (Daily: `<team>.daily.co`). */
  domain: string;
};

export interface VideoProvider {
  readonly id: VideoProviderId;
  /**
   * Create the session's room if needed (or refresh its settings) and issue a
   * join token for one user. Times are Unix seconds.
   */
  issueJoin(input: {
    sessionId: string;
    userId: string;
    userName?: string | null;
    roomExpiresAt: number;
    tokenExpiresAt: number;
  }): Promise<VideoJoin>;
}
