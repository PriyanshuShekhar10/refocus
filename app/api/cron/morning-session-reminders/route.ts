import { NextRequest, NextResponse } from "next/server";
import { unauthorizedCronResponse, verifyCronSecret } from "@/lib/cronAuth";
import { runMorningSessionReminders } from "@/lib/sessionReminderJobs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Daily morning digest (~7:00 AM IST via Vercel cron). */
export async function GET(req: NextRequest) {
  if (!verifyCronSecret(req)) return unauthorizedCronResponse();

  try {
    const result = await runMorningSessionReminders();
    return NextResponse.json({ ok: true, result });
  } catch (err) {
    console.error("[cron] morning session reminders failed:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
