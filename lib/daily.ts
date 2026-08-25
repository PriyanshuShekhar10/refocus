import { getActiveDailyAccount } from "@/lib/dailyAccounts";

const DAILY_API_BASE = "https://api.daily.co/v1";

export async function createOrGetDailyRoom(sessionId: string, exp?: number) {
  const { apiKey, domain } = await getActiveDailyAccount();

  // Room name must be URL-safe and unique per session
  const roomName = `session-${sessionId}`;
  const roomProperties = {
    enable_prejoin_ui: false,
    enable_screenshare: true,
    enable_chat: true,
    // Lock the room down: anyone with the token can join, no one is room owner.
    // Token's `user_id` ties the participant to our internal user.
    enable_knocking: false,
    eject_at_room_exp: true,
    exp: exp ?? Math.floor(Date.now() / 1000) + 60 * 60 * 24,
  };
  // Try get
  let roomRes = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    cache: "no-store",
  });
  if (roomRes.status === 404) {
    // Create a new room, expire in 1 day
    roomRes = await fetch(`${DAILY_API_BASE}/rooms`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: roomName,
        properties: roomProperties,
      }),
    });
  }
  if (!roomRes.ok) {
    const text = await roomRes.text();
    throw new Error(`Daily room error: ${roomRes.status} ${text}`);
  }
  // Existing rooms may have old config; enforce desired properties each time.
  const updateRes = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: roomProperties,
    }),
  });
  if (!updateRes.ok) {
    const text = await updateRes.text();
    throw new Error(`Daily room update error: ${updateRes.status} ${text}`);
  }

  const room = (await updateRes.json()) as Record<string, unknown>;
  return { room, roomName, domain } as {
    room: Record<string, unknown>;
    roomName: string;
    domain: string;
  };
}

export async function createDailyMeetingToken(
  roomName: string,
  userId: string,
  opts?: { userName?: string; exp?: number },
) {
  const { apiKey } = await getActiveDailyAccount();
  const sanitizedName = opts?.userName?.trim();
  const res = await fetch(`${DAILY_API_BASE}/meeting-tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: userId,
        ...(sanitizedName ? { user_name: sanitizedName } : {}),
        is_owner: false,
        exp: opts?.exp ?? Math.floor(Date.now() / 1000) + 60 * 60 * 2, // 2h
      },
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Daily token error: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.token as string;
}
