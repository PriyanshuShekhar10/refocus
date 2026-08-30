import { getResend, getResendFromEmail, isResendConfigured } from "@/lib/resend";
import {
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
}): Promise<{ sent: boolean; reason?: string }> {
  if (!isResendConfigured()) {
    console.warn("[email] RESEND_API_KEY not set; skipping ops notify");
    return { sent: false, reason: "not_configured" };
  }

  const resend = getResend();
  if (!resend) return { sent: false, reason: "not_configured" };

  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: OPS_NOTIFY_EMAIL,
    subject: input.subject,
    html: input.html,
    text: input.text,
  });

  if (error) {
    console.error("[email] ops notify failed:", error);
    return { sent: false, reason: "send_failed" };
  }

  return { sent: true };
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
