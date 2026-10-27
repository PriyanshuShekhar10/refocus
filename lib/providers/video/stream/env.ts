/**
 * CSP origins for the Stream Video + Chat SDKs. Unlike Daily (an iframe,
 * needing frame-src/media-src/Permissions-Policy), Stream runs in-page over
 * WebRTC/WebSocket, so it only needs connect-src for its coordinator APIs
 * and SFU edges.
 *
 * Stream doesn't publish a fixed CSP domain list — these are best-effort
 * defaults. Verify against actual CSP violation reports in the browser
 * console while testing locally (VIDEO_PROVIDER=stream) and extend this list
 * if the console reports a blocked origin not covered here.
 */
export function listStreamConnectOriginsFromEnv(): string[] {
  if (!process.env.STREAM_API_KEY) return [];
  return [
    "https://video.stream-io-api.com",
    "wss://video.stream-io-api.com",
    "https://*.stream-io-video.com",
    "wss://*.stream-io-video.com",
    "https://chat.stream-io-api.com",
    "wss://chat.stream-io-api.com",
  ];
}
