import Ably from "ably";

const ABLY_API_KEY = process.env.ABLY_API_KEY;

if (process.env.NODE_ENV === "production" && !ABLY_API_KEY) {
  throw new Error("Missing ABLY_API_KEY env var");
}

let restClient: Ably.Rest | null = null;

function getRestClient(): Ably.Rest {
  if (!ABLY_API_KEY) {
    throw new Error("Missing ABLY_API_KEY env var");
  }
  if (!restClient) {
    restClient = new Ably.Rest({ key: ABLY_API_KEY });
  }
  return restClient;
}

export async function publishAbly(channelName: string, event: unknown): Promise<void> {
  try {
    const rest = getRestClient();
    await rest.channels.get(channelName).publish("event", event);
  } catch (error) {
    console.error("[Ably] Failed to publish event:", error);
  }
}

export async function createAblyTokenRequest(params: {
  clientId: string;
  capability?: string;
}) {
  const rest = getRestClient();
  return rest.auth.createTokenRequest({
    clientId: params.clientId,
    capability: params.capability,
    ttl: 60 * 60 * 1000, // 1 hour
  });
}
