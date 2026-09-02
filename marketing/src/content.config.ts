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
      .enum(["productivity", "adhd", "exams", "loneliness", "remote"])
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

export const collections = { blog, blogId, blogFil, blogVi };
