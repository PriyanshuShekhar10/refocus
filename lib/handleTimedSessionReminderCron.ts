import { NextRequest, NextResponse } from "next/server";
import { unauthorizedCronResponse, verifyCronSecret } from "@/lib/cronAuth";
import { runTimedSessionReminders } from "@/lib/sessionReminderJobs";
import { runSessionNoShowCancellations } from "@/lib/sessionNoShowCancel";

export async function handleTimedSessionReminderCron(req: NextRequest) {
  if (!verifyCronSecret(req)) return unauthorizedCronResponse();

  try {
    const oneHour = await runTimedSessionReminders("1h");
    const noShows = await runSessionNoShowCancellations({ lookbackMinutes: 90 });
    return NextResponse.json({ ok: true, results: { oneHour, noShows } });
  } catch (err) {
    console.error("[cron] timed session reminders failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
