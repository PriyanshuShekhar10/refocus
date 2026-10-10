import { defineCollection, z } from "astro:content";
import { glob, type Loader } from "astro/loaders";

/**
 * English blog = markdown files in src/content/blog + posts published through
 * the dashboard API (POST /api/blog/publish, stored in MongoDB). API posts are
 * fetched at build time; a failed fetch fails the build so the live site keeps
 * the last good version instead of dropping posts.
 */
const BLOG_API_URL =
  process.env.BLOG_API_URL ?? "https://dashboard.refocus.co.in/api/blog/posts";

type ApiPost = {
  slug: string;
  title: string;
  description: string;
  markdown: string;
  category: string;
  tags: string[];
  author: string;
  coverImage: string | null;
  coverImageAlt: string | null;
  faq?: { q: string; a: string }[];
  pubDate: string;
  updatedAt?: string;
};

function blogLoader(): Loader {
  const files = glob({ pattern: "**/*.md", base: "./src/content/blog" });
  return {
    name: "blog-files-and-api",
    async load(ctx) {
      await files.load(ctx);
      if (process.env.BLOG_API_DISABLED === "1") return;
      const res = await fetch(BLOG_API_URL);
      if (!res.ok) throw new Error(`Blog API ${BLOG_API_URL} returned ${res.status}`);
      const { posts } = (await res.json()) as { posts: ApiPost[] };
      for (const p of posts) {
        if (ctx.store.has(p.slug)) {
          ctx.logger.warn(`Skipping API post "${p.slug}": a markdown file already uses that slug`);
          continue;
        }
        const data = await ctx.parseData({
          id: p.slug,
          data: {
            title: p.title,
            description: p.description,
            pubDate: p.pubDate,
            updatedDate: p.updatedAt && p.updatedAt !== p.pubDate ? p.updatedAt : undefined,
            category: p.category,
            tags: p.tags,
            author: p.author,
            coverImage: p.coverImage ?? undefined,
            coverImageAlt: p.coverImageAlt ?? undefined,
            faq: p.faq ?? [],
          },
        });
        ctx.store.set({
          id: p.slug,
          data,
          body: p.markdown,
          rendered: await ctx.renderMarkdown(p.markdown),
          digest: ctx.generateDigest(p),
        });
      }
      ctx.logger.info(`Loaded ${posts.length} API post(s)`);
    },
  };
}

const blog = defineCollection({
  loader: blogLoader(),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z
      .enum([
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
      ])
      .default("productivity"),
    tags: z.array(z.string()).default([]),
    author: z.string().default("Refocus Team"),
    coverImage: z.string().url().optional(),
    coverImageAlt: z.string().optional(),
    /** Answer-first FAQ (also emitted as FAQPage structured data). */
    faq: z.array(z.object({ q: z.string(), a: z.string() })).default([]),
    draft: z.boolean().default(false),
  }),
});

const blogId = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog-id" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z
      .enum(["productivity", "adhd", "exams", "loneliness", "remote"])
      .default("productivity"),
    tags: z.array(z.string()).default([]),
    author: z.string().default("Tim Refocus"),
    draft: z.boolean().default(false),
    locale: z.literal("id").default("id"),
  }),
});

const blogFil = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog-fil" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z
      .enum(["productivity", "adhd", "exams", "loneliness", "remote"])
      .default("productivity"),
    tags: z.array(z.string()).default([]),
    author: z.string().default("Tim Refocus"),
    draft: z.boolean().default(false),
    locale: z.literal("fil").default("fil"),
  }),
});

const blogVi = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog-vi" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z
      .enum(["productivity", "adhd", "exams", "loneliness", "remote"])
      .default("productivity"),
    tags: z.array(z.string()).default([]),
    author: z.string().default("Refocus Team"),
    draft: z.boolean().default(false),
    locale: z.literal("vi").default("vi"),
  }),
});

const blogDe = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog-de" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    category: z
      .enum(["productivity", "adhd", "exams", "loneliness", "remote"])
      .default("productivity"),
    tags: z.array(z.string()).default([]),
    author: z.string().default("Refocus Team"),
    draft: z.boolean().default(false),
    locale: z.literal("de").default("de"),
  }),
});

export const collections = { blog, blogId, blogFil, blogVi, blogDe };
