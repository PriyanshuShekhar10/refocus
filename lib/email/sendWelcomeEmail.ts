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

  // Must be the dashboard host — marketing apex has no /api/auth/* routes.
  const appUrl = getAppUrl();
  const verifyUrl = `${appUrl}/api/auth/verify-email?token=${encodeURIComponent(token)}`;
  const signInUrl = `${appUrl}/auth/login`;

  const { subject, html, text } = buildWelcomeVerifyEmail({
    firstName: input.firstName,
    verifyUrl,
    signInUrl,
  });

  return sendEmail({ to: input.email, subject, html, text }, "welcome email");
}
