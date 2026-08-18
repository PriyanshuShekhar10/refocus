import { NextRequest, NextResponse } from "next/server";
import { unauthorizedCronResponse, verifyCronSecret } from "@/lib/cronAuth";
import { runTimedSessionReminders } from "@/lib/sessionReminderJobs";

export async function handleTimedSessionReminderCron(req: NextRequest) {
  if (!verifyCronSecret(req)) return unauthorizedCronResponse();

  try {
    const oneHour = await runTimedSessionReminders("1h");
    return NextResponse.json({ ok: true, results: { oneHour } });
  } catch (err) {
    console.error("[cron] timed session reminders failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
