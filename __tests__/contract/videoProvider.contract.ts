/**
 * Rules every video provider adapter must follow. Run it against each adapter
 * (see videoProvider.test.ts); a new provider (e.g. LiveKit) adds one line there.
 */
import { describe, expect, it } from "vitest";
import type { VideoProvider } from "@/lib/providers/video";

const SESSION = "aaaaaaaaaaaaaaaaaaaaaaaa";
const BASE = {
  sessionId: SESSION,
  roomExpiresAt: 2_000_000_000,
  tokenExpiresAt: 1_999_999_000,
};

export function runVideoProviderContract(name: string, make: () => VideoProvider) {
  describe(`video provider contract: ${name}`, () => {
    it("issues a complete join for a user", async () => {
      const provider = make();
      const join = await provider.issueJoin({ ...BASE, userId: "user-a", userName: "Asha" });
      expect(join.provider).toBe(provider.id);
      for (const key of ["token", "roomName", "domain"] as const) {
        expect(typeof join[key]).toBe("string");
        expect(join[key].length).toBeGreaterThan(0);
      }
      expect(Object.keys(join).sort()).toEqual(["domain", "provider", "roomName", "token"]);
    });

    it("puts both partners of a session in the same room", async () => {
      const provider = make();
      const a = await provider.issueJoin({ ...BASE, userId: "user-a" });
      const b = await provider.issueJoin({ ...BASE, userId: "user-b", userName: null });
      expect(a.roomName).toBe(b.roomName);
      expect(a.domain).toBe(b.domain);
    });

    it("gives different sessions different rooms", async () => {
      const provider = make();
      const a = await provider.issueJoin({ ...BASE, userId: "user-a" });
      const b = await provider.issueJoin({ ...BASE, sessionId: "bbbbbbbbbbbbbbbbbbbbbbbb", userId: "user-a" });
      expect(a.roomName).not.toBe(b.roomName);
    });
  });
}
