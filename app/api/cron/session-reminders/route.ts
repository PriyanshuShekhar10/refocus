import { NextRequest, NextResponse } from "next/server";
import { unauthorizedCronResponse, verifyCronSecret } from "@/lib/cronAuth";
import { runTimedSessionReminders } from "@/lib/sessionReminderJobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Sends 1-hour and 10-minute session reminders (runs every 5 minutes). */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return unauthorizedCronResponse();

  try {
    const [oneHour, tenMin] = await Promise.all([
      runTimedSessionReminders("1h"),
      runTimedSessionReminders("10m"),
    ]);
    return NextResponse.json({ ok: true, results: { oneHour, tenMin } });
  } catch (err) {
    console.error("[cron] timed session reminders failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
