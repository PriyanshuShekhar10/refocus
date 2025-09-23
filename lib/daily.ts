const DAILY_API_BASE = "https://api.daily.co/v1";

export async function createOrGetDailyRoom(sessionId: string) {
  const apiKey = process.env.DAILY_API_KEY;
  const domain = process.env.DAILY_DOMAIN; // your-subdomain.daily.co
  if (!apiKey || !domain) {
    throw new Error("Missing DAILY_API_KEY or DAILY_DOMAIN env vars");
  }

  // Room name must be URL-safe and unique per session
  const roomName = `session-${sessionId}`;
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
        properties: {
          enable_screenshare: true,
          enable_chat: true,
          exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
        },
      }),
    });
  }
  if (!roomRes.ok) {
    const text = await roomRes.text();
    throw new Error(`Daily room error: ${roomRes.status} ${text}`);
  }
  const room = await roomRes.json();
  return { room, roomName, domain } as {
    room: any;
    roomName: string;
    domain: string;
  };
}

export async function createDailyMeetingToken(
  roomName: string,
  userId: string
) {
  const apiKey = process.env.DAILY_API_KEY;
  if (!apiKey) throw new Error("Missing DAILY_API_KEY env var");
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
