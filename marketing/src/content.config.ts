import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
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
