import { describe, expect, it, vi, beforeEach } from "vitest";
import type { EmailProvider } from "@/lib/providers/email";
import { runEmailProviderContract, type EmailAdapterHarness } from "./emailProvider.contract";

const resendSend = vi.fn();
vi.mock("@/lib/resend", () => ({
  getResend: vi.fn(() => ({ emails: { send: resendSend } })),
  getResendFromEmail: vi.fn(() => "Refocus <hello@refocus.co.in>"),
  isResendConfigured: vi.fn(() => true),
}));

import { isResendConfigured } from "@/lib/resend";
import { resendEmailProvider } from "@/lib/providers/email/resend";
import { getEmailProvider, isEmailConfigured, sendEmail } from "@/lib/providers/email";

function resendHarness(): EmailAdapterHarness {
  const delivered: Array<Record<string, unknown>> = [];
  let failWith: string | null = null;
  resendSend.mockReset();
  resendSend.mockImplementation(async (msg: Record<string, unknown>) => {
    if (failWith) {
      const message = failWith;
      failWith = null;
      return { data: null, error: { message } };
    }
    delivered.push(msg);
    return { data: { id: "e1" }, error: null };
  });
  return {
    provider: resendEmailProvider,
    delivered: () => delivered,
    failNext: (m) => (failWith = m),
  };
}

function fakeHarness(): EmailAdapterHarness {
  const delivered: Array<Record<string, unknown>> = [];
  let failWith: string | null = null;
  const provider: EmailProvider = {
    id: "resend",
    isConfigured: () => true,
    async send({ replyTo, ...rest }) {
      if (failWith) {
        failWith = null;
        return { ok: false, error: new Error("fail"), sandbox: false };
      }
      const reply = replyTo?.trim();
      delivered.push({ ...rest, ...(reply ? { replyTo: reply } : {}) });
      return { ok: true };
    },
  };
  return { provider, delivered: () => delivered, failNext: (m) => (failWith = m) };
}

runEmailProviderContract("fake", fakeHarness);
runEmailProviderContract("resend", resendHarness);

describe("resend adapter specifics", () => {
  it("sends from the configured address and flags sandbox refusals", async () => {
    const h = resendHarness();
    await h.provider.send({ to: "a@example.com", subject: "s", html: "h", text: "t" });
    expect(h.delivered()[0].from).toBe("Refocus <hello@refocus.co.in>");
    h.failNext("You can only send testing emails to your own email address");
    const res = await h.provider.send({ to: "a@example.com", subject: "s", html: "h", text: "t" });
    expect(res).toMatchObject({ ok: false, sandbox: true });
  });
});

describe("sendEmail", () => {
  const msg = { to: "a@example.com", subject: "s", html: "h", text: "t" };
  beforeEach(() => {
    resendHarness();
    vi.mocked(isResendConfigured).mockReturnValue(true);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("uses resend by default and for unknown EMAIL_PROVIDER values", () => {
    const prev = process.env.EMAIL_PROVIDER;
    process.env.EMAIL_PROVIDER = "nope";
    expect(getEmailProvider().id).toBe("resend");
    if (prev === undefined) delete process.env.EMAIL_PROVIDER;
    else process.env.EMAIL_PROVIDER = prev;
  });

  it("skips without calling the provider when not configured", async () => {
    vi.mocked(isResendConfigured).mockReturnValue(false);
    expect(isEmailConfigured()).toBe(false);
    expect(await sendEmail(msg, "test email")).toEqual({ sent: false, reason: "not_configured" });
    expect(resendSend).not.toHaveBeenCalled();
  });

  it("returns sent on success", async () => {
    expect(await sendEmail(msg, "test email")).toEqual({ sent: true });
  });

  it("logs sandbox refusals as warnings and other failures as errors", async () => {
    const h = resendHarness();
    h.failNext("only send testing emails to your own email");
    expect(await sendEmail(msg, "test email")).toEqual({ sent: false, reason: "send_failed" });
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("sandbox: cannot send test email to a@example.com"));

    h.failNext("boom");
    expect(await sendEmail(msg, "test email")).toEqual({ sent: false, reason: "send_failed" });
    expect(console.error).toHaveBeenCalledWith("[email] test email failed for a@example.com:", { message: "boom" });
  });
});
