import { NextRequest, NextResponse } from "next/server";
import { unauthorizedCronResponse, verifyCronSecret } from "@/lib/cronAuth";
import { runPushJoinReminders } from "@/lib/push/joinReminders";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends join-window push reminders (~10 minutes before a matched session).
 * Scheduled every 10 minutes; uses an 8–12 minute look-ahead window.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return unauthorizedCronResponse();

  try {
    const result = await runPushJoinReminders();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[cron] push join reminders failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
