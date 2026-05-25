import { Resend } from "resend";

let client: Resend | null = null;

export function getResend(): Resend | null {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return null;
  if (!client) client = new Resend(apiKey);
  return client;
}

export function getResendFromEmail(): string {
  return (
    process.env.RESEND_FROM_EMAIL ||
    process.env.RESEND_FROM ||
    "Refocus <hello@refocus.co.in>"
  );
}

export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
