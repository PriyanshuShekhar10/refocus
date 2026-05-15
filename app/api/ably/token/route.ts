import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createAblyTokenRequest } from "@/lib/ably-server";
import { globalChatChannel, sessionsChannel, userChannel } from "@/lib/realtimeChannels";

export async function GET() {
  const session = await getServerSession(authOptions);
  const user = session?.user as { id?: string } | undefined;
  const userId = user?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const capability = JSON.stringify({
      [globalChatChannel()]: ["subscribe", "publish", "history"],
      [userChannel(userId)]: ["subscribe"],
      "chat:*": ["subscribe", "publish", "history"],
      [sessionsChannel()]: ["subscribe"],
    });
    const tokenRequest = await createAblyTokenRequest({
      clientId: userId,
      capability,
    });
    return NextResponse.json(tokenRequest);
  } catch (error) {
    console.error("[Ably] Failed to create token request:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
