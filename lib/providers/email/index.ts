import { resendEmailProvider } from "./resend";
import {
  EMAIL_PROVIDER_IDS,
  type EmailMessage,
  type EmailProvider,
  type EmailProviderId,
} from "./types";

export type { EmailMessage, EmailProvider, EmailProviderId } from "./types";

const PROVIDERS: Record<EmailProviderId, EmailProvider> = {
  resend: resendEmailProvider,
};

/** EMAIL_PROVIDER env var, default "resend". */
export function getEmailProvider(): EmailProvider {
  const configured = process.env.EMAIL_PROVIDER?.trim();
  const id = (EMAIL_PROVIDER_IDS as readonly string[]).includes(configured ?? "")
    ? (configured as EmailProviderId)
    : "resend";
  return PROVIDERS[id];
}

export function isEmailConfigured(): boolean {
  return getEmailProvider().isConfigured();
}

export type SendEmailResult = { sent: boolean; reason?: "not_configured" | "send_failed" };

/**
 * Send one email. Never throws for provider errors: returns
 * `{ sent: false, reason }` and logs. `label` names the email in logs
 * (e.g. "match email").
 */
export async function sendEmail(message: EmailMessage, label: string): Promise<SendEmailResult> {
  const provider = getEmailProvider();
  if (!provider.isConfigured()) {
    console.warn(`[email] ${provider.id} not configured; skipping ${label}`);
    return { sent: false, reason: "not_configured" };
  }

  const result = await provider.send(message);
  if (result.ok) return { sent: true };

  if (result.sandbox) {
    console.warn(
      `[email] ${provider.id} sandbox: cannot send ${label} to ${message.to}. ` +
        "A test API key only delivers to the account owner's address; verify a sending domain.",
    );
  } else {
    console.error(`[email] ${label} failed for ${message.to}:`, result.error);
  }
  return { sent: false, reason: "send_failed" };
}
