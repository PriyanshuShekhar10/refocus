import { sendEmail, isEmailConfigured } from "@/lib/providers/email";
import { getAppUrl } from "@/lib/site";
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

export async function sendPasswordResetEmail(
  input: SendPasswordResetEmailInput,
): Promise<{ sent: boolean; reason?: string }> {
  if (!isEmailConfigured()) return { sent: false, reason: "not_configured" };

  const token = createPasswordResetToken();
  await setPasswordResetToken(input.userId, token);

  // Must be the dashboard host — marketing apex has no /auth/* routes.
  const appUrl = getAppUrl();
  const resetUrl = `${appUrl}/auth/reset-password?token=${encodeURIComponent(token)}`;

  const { subject, html, text } = buildPasswordResetEmail({
    firstName: input.firstName,
    resetUrl,
  });

  return sendEmail({ to: input.email, subject, html, text }, "password reset email");
}
