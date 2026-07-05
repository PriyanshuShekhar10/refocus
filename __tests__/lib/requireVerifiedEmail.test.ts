import { describe, it, expect, vi, beforeEach } from "vitest";
import { ObjectId } from "mongodb";

vi.unmock("@/lib/requireVerifiedEmail");

const findOne = vi.fn();

vi.mock("@/lib/mongodb", () => ({
  getDb: vi.fn().mockResolvedValue({
    collection: () => ({ findOne }),
  }),
}));

describe("requireVerifiedEmail", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null when the user is verified", async () => {
    findOne.mockResolvedValue({ emailVerified: new Date() });
    const { requireVerifiedEmail } = await import("@/lib/requireVerifiedEmail");
    const userId = new ObjectId().toString();

    await expect(requireVerifiedEmail(userId)).resolves.toBeNull();
  });

  it("returns 403 when the user is not verified", async () => {
    findOne.mockResolvedValue({ emailVerified: null });
    const { requireVerifiedEmail, EMAIL_NOT_VERIFIED_CODE } = await import(
      "@/lib/requireVerifiedEmail"
    );
    const userId = new ObjectId().toString();

    const res = await requireVerifiedEmail(userId);
    expect(res?.status).toBe(403);
    const body = await res!.json();
    expect(body.code).toBe(EMAIL_NOT_VERIFIED_CODE);
  });
});
