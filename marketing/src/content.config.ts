import { defineCollection, z } from "astro:content";
import { glob } from "astro/loaders";

// Blog posts live as Markdown in `src/content/blog/*.md`. New posts are added
// by hand or by `scripts/generate-post.mjs` (OpenAI) and go live on the next
// Cloudflare Pages build.
const blog = defineCollection({
  loader: glob({ pattern: "**/*.md", base: "./src/content/blog" }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    pubDate: z.coerce.date(),
    updatedDate: z.coerce.date().optional(),
    tags: z.array(z.string()).default([]),
    author: z.string().default("Refocus Team"),
    draft: z.boolean().default(false),
  }),
});

export const collections = { blog };
