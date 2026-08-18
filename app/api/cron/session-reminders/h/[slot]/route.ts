import { handleTimedSessionReminderCron } from "@/lib/handleTimedSessionReminderCron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Unique hourly paths so Vercel registers all 24 daily Hobby crons. */
export const GET = handleTimedSessionReminderCron;
