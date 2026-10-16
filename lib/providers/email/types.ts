/**
 * Email provider interface. Senders in lib/email build the message; only the
 * adapter here talks to the vendor, so switching providers is one new adapter.
 */

export type EmailProviderId = "resend";

export const EMAIL_PROVIDER_IDS: readonly EmailProviderId[] = ["resend"];

export type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text: string;
  replyTo?: string | null;
};

export type ProviderSendResult =
  | { ok: true }
  | {
      ok: false;
      error: unknown;
      /** The provider refused because the account is in test/sandbox mode. */
      sandbox: boolean;
    };

export interface EmailProvider {
  readonly id: EmailProviderId;
  isConfigured(): boolean;
  send(message: EmailMessage): Promise<ProviderSendResult>;
}
