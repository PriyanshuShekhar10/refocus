const DAILY_API_BASE = "https://api.daily.co/v1";
const DAILY_API_KEY = process.env.DAILY_API_KEY;
const DAILY_DOMAIN = process.env.DAILY_DOMAIN;

if (process.env.NODE_ENV === "production" && (!DAILY_API_KEY || !DAILY_DOMAIN)) {
  throw new Error("Missing DAILY_API_KEY or DAILY_DOMAIN env vars");
}

export async function createOrGetDailyRoom(sessionId: string, exp?: number) {
  if (!DAILY_API_KEY || !DAILY_DOMAIN) {
    throw new Error("Missing DAILY_API_KEY or DAILY_DOMAIN env vars");
  }

  // Room name must be URL-safe and unique per session
  const roomName = `session-${sessionId}`;
  // Try get
  let roomRes = await fetch(`${DAILY_API_BASE}/rooms/${roomName}`, {
    headers: { Authorization: `Bearer ${DAILY_API_KEY}` },
    cache: "no-store",
  });
  if (roomRes.status === 404) {
    // Create a new room, expire in 1 day
    roomRes = await fetch(`${DAILY_API_BASE}/rooms`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${DAILY_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: roomName,
        properties: {
          enable_screenshare: true,
          enable_chat: true,
          exp: exp ?? Math.floor(Date.now() / 1000) + 60 * 60 * 24,
        },
      }),
    });
  }
  if (!roomRes.ok) {
    const text = await roomRes.text();
    throw new Error(`Daily room error: ${roomRes.status} ${text}`);
  }
  const room = (await roomRes.json()) as Record<string, unknown>;
  return { room, roomName, domain: DAILY_DOMAIN } as {
    room: Record<string, unknown>;
    roomName: string;
    domain: string;
  };
}

export async function createDailyMeetingToken(
  roomName: string,
  userId: string
) {
  if (!DAILY_API_KEY) throw new Error("Missing DAILY_API_KEY env var");
  const res = await fetch(`${DAILY_API_BASE}/meeting-tokens`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${DAILY_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      properties: {
        room_name: roomName,
        user_id: userId,
        is_owner: false,
        exp: Math.floor(Date.now() / 1000) + 60 * 60 * 2, // 2h
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
