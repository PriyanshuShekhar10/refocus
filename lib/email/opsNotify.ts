import { sendEmail } from "@/lib/providers/email";
import {
  buildOpsBugReportEmail,
  buildOpsReportEmail,
  buildOpsSessionMatchedEmail,
  buildOpsSignupEmail,
} from "@/lib/email/opsTemplates";
import { isOpsNotifyKindEnabled } from "@/lib/email/opsNotifyPrefs";

export const OPS_NOTIFY_EMAIL = "priyanshushekhar100@gmail.com";

async function sendOpsEmail(input: {
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
}): Promise<{ sent: boolean; reason?: string }> {
  return sendEmail(
    { to: OPS_NOTIFY_EMAIL, subject: input.subject, html: input.html, text: input.text, replyTo: input.replyTo },
    "ops notify",
  );
}

/** Fire-and-forget safe: never throws to the request path. */
export async function notifyOpsSignup(input: {
  email: string;
  firstName?: string | null;
  method: "email" | "google";
  userId: string;
}): Promise<void> {
  try {
    if (!(await isOpsNotifyKindEnabled("signup"))) return;
    const built = buildOpsSignupEmail(input);
    await sendOpsEmail(built);
  } catch (err) {
    console.error("[email] notifyOpsSignup failed:", err);
  }
}

/** Fire-and-forget safe: never throws to the request path. */
export async function notifyOpsSessionMatched(input: {
  sessionTitle: string;
  startsAtLabel: string;
  host: { name?: string | null; email?: string | null };
  joiner: { name?: string | null; email?: string | null };
  joinUrl: string;
}): Promise<void> {
  try {
    if (!(await isOpsNotifyKindEnabled("sessionMatched"))) return;
    const built = buildOpsSessionMatchedEmail(input);
    await sendOpsEmail(built);
  } catch (err) {
    console.error("[email] notifyOpsSessionMatched failed:", err);
  }
}

/** Fire-and-forget safe: never throws to the request path. */
export async function notifyOpsReport(input: {
  reportId: string;
  targetTypeLabel: string;
  reasonLabel: string;
  reporter: { email?: string | null };
  reported: { name?: string | null; email?: string | null };
  details?: string | null;
  contentSnapshot?: string | null;
  duplicate?: boolean;
  adminUrl?: string | null;
}): Promise<void> {
  try {
    if (!(await isOpsNotifyKindEnabled("report"))) return;
    const built = buildOpsReportEmail(input);
    await sendOpsEmail(built);
  } catch (err) {
    console.error("[email] notifyOpsReport failed:", err);
  }
}

/** Bug reports always email the team (not gated by ops notify toggles). */
export async function notifyOpsBugReport(
  input: Parameters<typeof buildOpsBugReportEmail>[0],
): Promise<{ sent: boolean }> {
  try {
    const built = buildOpsBugReportEmail(input);
    const res = await sendOpsEmail({ ...built, replyTo: input.reporter.email ?? null });
    return { sent: res.sent };
  } catch (err) {
    console.error("[email] notifyOpsBugReport failed:", err);
    return { sent: false };
  }
}
