import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { checkRateLimit, rateLimitedResponse } from "@/lib/ratelimit";
import {
  deletePushDevice,
  isValidExpoPushToken,
  isValidPushPlatform,
  upsertPushDevice,
} from "@/lib/push/devices";

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
    token?: string;
    platform?: string;
  };
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token || !isValidExpoPushToken(token)) {
    return NextResponse.json({ error: "Invalid token" }, { status: 400 });
  }
  if (!isValidPushPlatform(body.platform)) {
    return NextResponse.json({ error: "Invalid platform" }, { status: 400 });
  }

  await upsertPushDevice({
    userId,
    token,
    platform: body.platform,
  });

  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json().catch(() => ({}))) as { token?: string };
  const token = typeof body.token === "string" ? body.token.trim() : "";
  if (!token) {
    return NextResponse.json({ error: "Missing token" }, { status: 400 });
  }

  await deletePushDevice(userId, token);
  return NextResponse.json({ ok: true });
}
