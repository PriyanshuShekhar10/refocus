import { createHash, timingSafeEqual } from "crypto";
import type { Db } from "mongodb";

/** Must match the `blog` collection categories on the marketing site. */
export const BLOG_CATEGORIES = [
  "productivity",
  "adhd",
  "exams",
  "loneliness",
  "remote",
  "med-school",
  "phd",
  "engineers",
  "parents",
  "career-switch",
  "writers",
  "law",
  "nurses",
  "founders",
  "teachers",
] as const;
export type BlogCategory = (typeof BLOG_CATEGORIES)[number];

export const BLOG_POSTS_COLLECTION = "blog_posts";
export const BLOG_SITE_URL = "https://refocus.co.in";

export type BlogPostDoc = {
  slug: string;
  title: string;
  description: string;
  markdown: string;
  category: BlogCategory;
  tags: string[];
  author: string;
  coverImage: string | null;
  coverImageAlt: string | null;
  pubDate: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type PublishInput = {
  title?: unknown;
  description?: unknown;
  markdown?: unknown;
  category?: unknown;
  tags?: unknown;
  author?: unknown;
  coverImage?: unknown;
  coverImageAlt?: unknown;
  slug?: unknown;
};

// ── Auth ────────────────────────────────────────────────────────────────

const sha256 = (v: string) => createHash("sha256").update(v).digest();

/**
 * The publish key is never stored: BLOG_PUBLISH_KEY_SHA256 holds the hex
 * SHA-256 of it. Accepts `Authorization: Bearer <key>` or `x-api-key`.
 */
export function isValidPublishKey(headers: Headers): boolean {
  const expectedHex = process.env.BLOG_PUBLISH_KEY_SHA256?.trim().toLowerCase();
  if (!expectedHex || !/^[0-9a-f]{64}$/.test(expectedHex)) return false;
  const auth = headers.get("authorization") ?? "";
  const key = auth.toLowerCase().startsWith("bearer ")
    ? auth.slice(7).trim()
    : (headers.get("x-api-key") ?? "").trim();
  if (!key) return false;
  return timingSafeEqual(sha256(key), Buffer.from(expectedHex, "hex"));
}

// ── Formatting ──────────────────────────────────────────────────────────

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export function slugify(text: string): string {
  return text
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");
}

function safeImageUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

const IMAGE_EXT = /\.(png|jpe?g|gif|webp|avif|svg)(\?[^\s]*)?$/i;

/**
 * Normalises a writer's markdown so it renders cleanly on the blog:
 * - unifies line endings, trims trailing spaces, collapses 3+ blank lines
 * - drops a leading `# Title` (the page already renders the title)
 * - demotes any other `# H1` to `##` (one H1 per page)
 * - turns a bare image URL on its own line into `![](url)`
 * - escapes raw HTML outside code so posts can't inject scripts or embeds
 * - forces https on images and rejects javascript:/data: links
 */
export function formatMarkdown(raw: string, title: string): string {
  let text = raw.replace(/\r\n?/g, "\n").replace(/\t/g, "  ");
  const lines = text.split("\n").map((l) => l.replace(/[ \t]+$/g, ""));

  // Leading H1 that repeats the title.
  const firstContent = lines.findIndex((l) => l.trim() !== "");
  if (firstContent >= 0 && /^#\s+/.test(lines[firstContent])) {
    lines.splice(firstContent, 1);
  }

  let inFence = false;
  const out: string[] = [];
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      continue;
    }
    let l = line;
    if (/^#\s+/.test(l)) l = `#${l}`;
    const bare = l.trim();
    if (/^https:\/\/\S+$/.test(bare) && IMAGE_EXT.test(bare)) {
      l = `![](${bare})`;
    }
    // Escape raw HTML outside inline code spans.
    l = l
      .split(/(`[^`]*`)/g)
      .map((part) => (part.startsWith("`") ? part : part.replace(/</g, "&lt;")))
      .join("");
    // Strip dangerous link targets: [x](javascript:...) / ![x](data:...)
    l = l.replace(/\]\(\s*(javascript|data|vbscript):[^)]*\)/gi, "](#)");
    // Upgrade http image links.
    l = l.replace(/!\[([^\]]*)\]\(\s*http:\/\//g, "![$1](https://");
    out.push(l);
  }
  if (inFence) out.push("```");

  text = out.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  void title;
  return `${text}\n`;
}

export type ValidationResult =
  | { ok: true; post: Omit<BlogPostDoc, "createdAt" | "updatedAt" | "pubDate"> }
  | { ok: false; errors: string[] };

export function validatePost(input: PublishInput): ValidationResult {
  const errors: string[] = [];
  const title = str(input.title);
  const description = str(input.description);
  const markdown = typeof input.markdown === "string" ? input.markdown : "";
  const author = str(input.author);
  const category = (str(input.category) || "productivity") as BlogCategory;
  const coverRaw = str(input.coverImage);
  const coverImageAlt = str(input.coverImageAlt) || null;

  if (title.length < 5 || title.length > 140) errors.push("title must be 5–140 characters");
  if (description.length < 20 || description.length > 300)
    errors.push("description must be 20–300 characters");
  if (markdown.trim().length < 200) errors.push("markdown must be at least 200 characters");
  if (markdown.length > 100_000) errors.push("markdown must be under 100,000 characters");
  if (!author || author.length > 80) errors.push("author is required (max 80 characters)");
  if (!BLOG_CATEGORIES.includes(category))
    errors.push(`category must be one of: ${BLOG_CATEGORIES.join(", ")}`);

  let tags: string[] = [];
  if (input.tags !== undefined) {
    if (!Array.isArray(input.tags) || input.tags.some((t) => typeof t !== "string")) {
      errors.push("tags must be an array of strings");
    } else {
      tags = [...new Set((input.tags as string[]).map((t) => t.trim().toLowerCase()).filter(Boolean))]
        .map((t) => t.slice(0, 40))
        .slice(0, 10);
    }
  }

  let coverImage: string | null = null;
  if (coverRaw) {
    coverImage = safeImageUrl(coverRaw);
    if (!coverImage) errors.push("coverImage must be an https URL");
  }

  const slug = slugify(str(input.slug) || title);
  if (!slug) errors.push("could not build a URL slug from the title");

  if (errors.length) return { ok: false, errors };
  return {
    ok: true,
    post: {
      slug,
      title,
      description,
      markdown: formatMarkdown(markdown, title),
      category,
      tags,
      author,
      coverImage,
      coverImageAlt: coverImage ? coverImageAlt || title : null,
    },
  };
}

export async function ensureBlogIndexes(db: Db) {
  await db.collection(BLOG_POSTS_COLLECTION).createIndex({ slug: 1 }, { unique: true });
}

/**
 * Kick off the marketing site's "Deploy marketing site" workflow so the new
 * post is built into the static blog. Needs BLOG_DEPLOY_GITHUB_TOKEN with
 * Actions: write on the repo.
 */
export async function triggerBlogDeploy(): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.BLOG_DEPLOY_GITHUB_TOKEN?.trim();
  const repo = process.env.BLOG_DEPLOY_REPO?.trim() || "PriyanshuShekhar10/refocus";
  if (!token) return { ok: false, error: "BLOG_DEPLOY_GITHUB_TOKEN not set" };
  const res = await fetch(
    `https://api.github.com/repos/${repo}/actions/workflows/deploy-marketing.yml/dispatches`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ref: "landing" }),
    },
  );
  if (res.status === 204) return { ok: true };
  return { ok: false, error: `GitHub returned ${res.status}` };
}
