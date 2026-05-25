import { getResend, getResendFromEmail, isResendConfigured } from "@/lib/resend";
import { getSiteUrl } from "@/lib/site";
import {
  createVerificationToken,
  setEmailVerificationToken,
} from "@/lib/emailVerification";
import { buildWelcomeVerifyEmail } from "@/lib/email/templates";

export type SendWelcomeEmailInput = {
  userId: string;
  email: string;
  firstName?: string | null;
};

export async function sendWelcomeVerificationEmail(
  input: SendWelcomeEmailInput,
): Promise<{ sent: boolean; reason?: string }> {
  if (!isResendConfigured()) {
    console.warn("[email] RESEND_API_KEY not set; skipping welcome email");
    return { sent: false, reason: "not_configured" };
  }

  const resend = getResend();
  if (!resend) return { sent: false, reason: "not_configured" };

  const token = createVerificationToken();
  await setEmailVerificationToken(input.userId, token);

  const siteUrl = getSiteUrl();
  const verifyUrl = `${siteUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const signInUrl = `${siteUrl}/auth/login`;

  const { subject, html, text } = buildWelcomeVerifyEmail({
    firstName: input.firstName,
    verifyUrl,
    signInUrl,
  });

  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: input.email,
    subject,
    html,
    text,
  });

  if (error) {
    const msg =
      typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : String(error);

    if (msg.includes("only send testing emails to your own email")) {
      console.warn(
        `[email] Resend sandbox: cannot send to ${input.email}. ` +
          "On a free/test API key, Resend only delivers to the email on your Resend account. " +
          "Sign up with that address for local testing, or verify a domain at https://resend.com/domains " +
          "and set RESEND_FROM_EMAIL to an address on that domain.",
      );
    } else {
      console.error("[email] Resend error:", error);
    }
    return { sent: false, reason: "send_failed" };
  }

  return { sent: true };
}
