import { createHash } from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import { formatMarkdown, isValidPublishKey, slugify, validatePost } from "@/lib/blogPosts";

const body = "Focus is a skill. ".repeat(20);

describe("slugify", () => {
  it("builds clean URL slugs", () => {
    expect(slugify("How to Focus: 5 Tips (that work!)")).toBe("how-to-focus-5-tips-that-work");
    expect(slugify("Café déjà vu")).toBe("cafe-deja-vu");
  });
});

describe("formatMarkdown", () => {
  it("drops a leading title heading and demotes other H1s", () => {
    const out = formatMarkdown("# My Title\n\nIntro\n\n# Section\nText", "My Title");
    expect(out).not.toContain("# My Title");
    expect(out).toContain("## Section");
  });

  it("turns a bare image URL into an image", () => {
    expect(formatMarkdown("Look:\n\nhttps://x.com/a.png\n", "t")).toContain("![](https://x.com/a.png)");
  });

  it("escapes raw HTML but leaves code alone", () => {
    const out = formatMarkdown("<script>alert(1)</script>\n\n`<b>`\n\n```\n<div>\n```", "t");
    expect(out).toContain("&lt;script>");
    expect(out).toContain("`<b>`");
    expect(out).toContain("<div>");
  });

  it("neutralises javascript: links and upgrades http images", () => {
    const out = formatMarkdown("[x](javascript:alert(1)) ![a](http://x.com/a.jpg)", "t");
    expect(out).toContain("[x](#)");
    expect(out).toContain("![a](https://x.com/a.jpg)");
  });

  it("collapses extra blank lines and normalises line endings", () => {
    expect(formatMarkdown("a\r\n\r\n\r\n\r\nb", "t")).toBe("a\n\nb\n");
  });
});

describe("validatePost", () => {
  const ok = {
    title: "A good post title",
    description: "A description that is long enough to pass.",
    markdown: body,
    author: "John Smith",
  };

  it("accepts a valid post and fills defaults", () => {
    const r = validatePost({ ...ok, tags: ["Focus", "focus", " study "] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.post.slug).toBe("a-good-post-title");
      expect(r.post.category).toBe("productivity");
      expect(r.post.tags).toEqual(["focus", "study"]);
      expect(r.post.coverImage).toBeNull();
    }
  });

  it("requires https cover images and fills alt text", () => {
    expect(validatePost({ ...ok, coverImage: "http://x.com/a.png" }).ok).toBe(false);
    const r = validatePost({ ...ok, coverImage: "https://x.com/a.png" });
    expect(r.ok && r.post.coverImageAlt).toBe("A good post title");
  });

  it("reports every problem", () => {
    const r = validatePost({ title: "x", category: "nope" });
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.errors.length).toBeGreaterThanOrEqual(4);
  });
});

describe("isValidPublishKey", () => {
  const key = "rfb_test_key";
  afterEach(() => {
    delete process.env.BLOG_PUBLISH_KEY_SHA256;
  });

  it("matches the hashed key from Bearer or x-api-key", () => {
    process.env.BLOG_PUBLISH_KEY_SHA256 = createHash("sha256").update(key).digest("hex");
    expect(isValidPublishKey(new Headers({ authorization: `Bearer ${key}` }))).toBe(true);
    expect(isValidPublishKey(new Headers({ "x-api-key": key }))).toBe(true);
    expect(isValidPublishKey(new Headers({ authorization: "Bearer wrong" }))).toBe(false);
  });

  it("rejects everything when no key is configured", () => {
    expect(isValidPublishKey(new Headers({ authorization: `Bearer ${key}` }))).toBe(false);
  });
});
