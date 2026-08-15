import { NextRequest, NextResponse } from "next/server";
import { unauthorizedCronResponse, verifyCronSecret } from "@/lib/cronAuth";
import { runTimedSessionReminders } from "@/lib/sessionReminderJobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends ~1-hour session reminders.
 * Scheduled hourly via 24 once-daily Vercel Hobby cron entries (see vercel.json).
 * 10-minute reminders stay in code but are not run here — they need a sub-hourly
 * cadence (Pro plan) to be reliable.
 */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return unauthorizedCronResponse();

  try {
    const oneHour = await runTimedSessionReminders("1h");
    return NextResponse.json({ ok: true, results: { oneHour } });
  } catch (err) {
    console.error("[cron] timed session reminders failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
