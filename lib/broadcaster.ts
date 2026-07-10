import { publish as publishLocal, EventPayload } from "./sse";
import { publishAbly } from "./ably-server";

/**
 * Broadcasts an event to all available Pub/Sub providers.
 * Currently uses local SSE for same-process subscribers and Ably for cross-process/client websockets.
 */
export async function broadcastEvent(
  channel: string,
  event: EventPayload
): Promise<void> {
  // Fire to both synchronously and wait for both to resolve
  await Promise.all([
    publishLocal(channel, event),
    publishAbly(channel, event)
  ]);
}
