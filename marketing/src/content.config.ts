import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    // Niche: productivity | adhd | exams | loneliness | remote
    category: z
      .enum(["productivity", "adhd", "exams", "loneliness", "remote"])
      .default("productivity"),
    tags: z.array(z.string()).default([]),
    author: z.string().default("Refocus Team"),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
