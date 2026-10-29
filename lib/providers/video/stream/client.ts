import { StreamClient } from "@stream-io/node-sdk";

let client: StreamClient | null = null;

/** Server-side Stream client, built from STREAM_API_KEY/STREAM_API_SECRET. */
export function getStreamServerClient(): StreamClient {
  if (client) return client;
  const apiKey = process.env.STREAM_API_KEY;
  const apiSecret = process.env.STREAM_API_SECRET;
  if (!apiKey || !apiSecret) {
    throw new Error(
      "STREAM_API_KEY and STREAM_API_SECRET must be set to use the stream video provider",
    );
  }
  client = new StreamClient(apiKey, apiSecret);
  return client;
}
