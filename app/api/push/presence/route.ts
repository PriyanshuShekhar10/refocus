import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import { setPushPresence } from "@/lib/push/presence";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rl = await checkRateLimit(userId, "api");
  if (!rl.success) return rateLimitedResponse(rl);

  const body = (await req.json().catch(() => ({}))) as {
    inCall?: unknown;
    sessionId?: unknown;
  };
  if (typeof body.inCall !== "boolean") {
    return NextResponse.json({ error: "inCall must be a boolean" }, { status: 400 });
  }
  const sessionId =
    typeof body.sessionId === "string" && body.sessionId.trim()
      ? body.sessionId.trim()
      : null;

  await setPushPresence({
    userId,
    inCall: body.inCall,
    sessionId,
  });

  return NextResponse.json({ ok: true });
}
