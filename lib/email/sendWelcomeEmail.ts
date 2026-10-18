import { sendEmail, isEmailConfigured } from "@/lib/providers/email";
import { getAppUrl } from "@/lib/site";
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
  if (!isEmailConfigured()) return { sent: false, reason: "not_configured" };

  const token = createVerificationToken();
  await setEmailVerificationToken(input.userId, token);

  // Must be the dashboard host — marketing apex has no /auth/* routes.
  // Points at the page (not the API route) so the actual verification
  // happens on an explicit user click, not on GET — email security
  // scanners prefetch links automatically and would otherwise burn the
  // one-time token before the user ever opens the message.
  const appUrl = getAppUrl();
  const verifyUrl = `${appUrl}/auth/verify-email?token=${encodeURIComponent(token)}`;
  const signInUrl = `${appUrl}/auth/login`;

  const { subject, html, text } = buildWelcomeVerifyEmail({
    firstName: input.firstName,
    verifyUrl,
    signInUrl,
  });

  return sendEmail({ to: input.email, subject, html, text }, "welcome email");
}
