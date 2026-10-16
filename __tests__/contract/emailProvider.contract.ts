/**
 * Rules every email provider adapter must follow. Run it against each adapter
 * (see emailProvider.test.ts); a new provider adds one line there.
 */
import { describe, expect, it } from "vitest";
import type { EmailProvider } from "@/lib/providers/email";

export type EmailAdapterHarness = {
  provider: EmailProvider;
  /** Messages the vendor received, as { to, subject, html, text, replyTo? }. */
  delivered(): Array<Record<string, unknown>>;
  failNext(message: string): void;
};

const MESSAGE = {
  to: "member@example.com",
  subject: "Subject",
  html: "<p>Hello</p>",
  text: "Hello",
};

export function runEmailProviderContract(name: string, make: () => EmailAdapterHarness) {
  describe(`email provider contract: ${name}`, () => {
    it("reports whether it is configured", () => {
      expect(typeof make().provider.isConfigured()).toBe("boolean");
    });

    it("delivers to, subject, html and text unchanged", async () => {
      const h = make();
      expect(await h.provider.send(MESSAGE)).toEqual({ ok: true });
      expect(h.delivered()).toHaveLength(1);
      expect(h.delivered()[0]).toMatchObject(MESSAGE);
    });

    it("sets reply-to only when one is given", async () => {
      const h = make();
      await h.provider.send({ ...MESSAGE, replyTo: "partner@example.com" });
      await h.provider.send({ ...MESSAGE, replyTo: null });
      await h.provider.send({ ...MESSAGE, replyTo: "   " });
      const [withReply, nullReply, blankReply] = h.delivered();
      expect(withReply.replyTo).toBe("partner@example.com");
      expect(nullReply).not.toHaveProperty("replyTo");
      expect(blankReply).not.toHaveProperty("replyTo");
    });

    it("returns failures instead of throwing", async () => {
      const h = make();
      h.failNext("mailbox unavailable");
      const res = await h.provider.send(MESSAGE);
      expect(res.ok).toBe(false);
      if (!res.ok) expect(res.sandbox).toBe(false);
    });
  });
}
