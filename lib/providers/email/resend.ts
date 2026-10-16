import { getResend, getResendFromEmail, isResendConfigured } from "@/lib/resend";
import type { EmailProvider } from "./types";

function errorMessage(error: unknown): string {
  return typeof error === "object" && error !== null && "message" in error
    ? String((error as { message: unknown }).message)
    : String(error);
}

/** Resend adapter. Sends from RESEND_FROM_EMAIL (see lib/resend). */
export const resendEmailProvider: EmailProvider = {
  id: "resend",
  isConfigured: isResendConfigured,
  async send({ to, subject, html, text, replyTo }) {
    const resend = getResend();
    if (!resend) {
      return { ok: false, error: new Error("RESEND_API_KEY not set"), sandbox: false };
    }
    const reply = replyTo?.trim();
    const { error } = await resend.emails.send({
      from: getResendFromEmail(),
      to,
      ...(reply ? { replyTo: reply } : {}),
      subject,
      html,
      text,
    });
    if (!error) return { ok: true };
    return {
      ok: false,
      error,
      sandbox: errorMessage(error).includes("only send testing emails to your own email"),
    };
  },
};
