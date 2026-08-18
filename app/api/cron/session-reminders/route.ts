import { handleTimedSessionReminderCron } from "@/lib/handleTimedSessionReminderCron";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Sends ~1-hour session reminders (the default reminder).
 * vercel.json uses 24 unique once-daily paths (`/h/0` … `/h/23`) because Hobby
 * only allows daily cron expressions — one shared path was not enough.
 * Morning digest is a separate opt-in cron. 10-minute reminders are not run.
 */
export const GET = handleTimedSessionReminderCron;
