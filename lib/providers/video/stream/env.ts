/**
 * CSP origins for the Stream Video + Chat SDKs. Unlike Daily (an iframe,
 * needing frame-src/media-src/Permissions-Policy), Stream runs in-page over
 * WebRTC/WebSocket, so it only needs connect-src for its coordinator APIs
 * and SFU edges.
 *
 * Per Stream's own networking doc (getstream.io/video/docs/react/misc/networking),
 * clients need *.stream-io-video.com (SFU edges, e.g.
 * sfu-<id>-aws-sao1.stream-io-video.com), *.stream-io-api.com (coordinator,
 * e.g. video.stream-io-api.com), and *.getstream.io — all over HTTPS/WSS.
 */
export function listStreamConnectOriginsFromEnv(): string[] {
  if (!process.env.STREAM_API_KEY) return [];
  return [
    "https://*.stream-io-api.com",
    "wss://*.stream-io-api.com",
    "https://*.stream-io-video.com",
    "wss://*.stream-io-video.com",
    "https://*.getstream.io",
    "wss://*.getstream.io",
  ];
}
