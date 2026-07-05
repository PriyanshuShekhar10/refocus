import { describe, expect, it } from "vitest";
import {
  isManagedAvatarUrl,
  resolveAvatarUrl,
} from "@/lib/userAvatar";

describe("resolveAvatarUrl", () => {
  it("prefers avatar_url over image", () => {
    expect(
      resolveAvatarUrl({
        avatar_url: "https://blob.example/a.jpg",
        image: "https://legacy.example/b.jpg",
      }),
    ).toBe("https://blob.example/a.jpg");
  });

  it("falls back to image", () => {
    expect(resolveAvatarUrl({ image: "https://legacy.example/b.jpg" })).toBe(
      "https://legacy.example/b.jpg",
    );
  });

  it("returns null when empty", () => {
    expect(resolveAvatarUrl({ avatar_url: "  ", image: null })).toBeNull();
  });
});

describe("isManagedAvatarUrl", () => {
  it("detects vercel blob hosts", () => {
    expect(
      isManagedAvatarUrl(
        "https://abc123.public.blob.vercel-storage.com/avatars/u1.jpg",
      ),
    ).toBe(true);
  });

  it("rejects other hosts", () => {
    expect(isManagedAvatarUrl("https://example.com/photo.jpg")).toBe(false);
  });
});
