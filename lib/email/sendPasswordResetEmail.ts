import { getResend, getResendFromEmail, isResendConfigured } from "@/lib/resend";
import { getSiteUrl } from "@/lib/site";
import {
  createPasswordResetToken,
  setPasswordResetToken,
} from "@/lib/passwordReset";
import { buildPasswordResetEmail } from "@/lib/email/templates";

export type SendPasswordResetEmailInput = {
  userId: string;
  email: string;
  firstName?: string | null;
};

function logResendFailure(email: string, error: unknown) {
  const msg =
    typeof error === "object" && error !== null && "message" in error
      ? String((error as { message: unknown }).message)
      : String(error);

  if (msg.includes("only send testing emails to your own email")) {
    console.warn(
      `[email] Resend sandbox: cannot send password reset to ${email}. ` +
        "Use the email on your Resend account for local testing, or verify a domain.",
    );
  } else {
    console.error("[email] Resend password reset error:", error);
  }
}

export async function sendPasswordResetEmail(
  input: SendPasswordResetEmailInput,
): Promise<{ sent: boolean; reason?: string }> {
  if (!isResendConfigured()) {
    console.warn("[email] RESEND_API_KEY not set; skipping password reset email");
    return { sent: false, reason: "not_configured" };
  }

  const resend = getResend();
  if (!resend) return { sent: false, reason: "not_configured" };

  const token = createPasswordResetToken();
  await setPasswordResetToken(input.userId, token);

  const siteUrl = getSiteUrl();
  const resetUrl = `${siteUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

  const { subject, html, text } = buildPasswordResetEmail({
    firstName: input.firstName,
    resetUrl,
  });

  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: input.email,
    subject,
    html,
    text,
  });

  if (error) {
    logResendFailure(input.email, error);
    return { sent: false, reason: "send_failed" };
  }

  return { sent: true };
}
