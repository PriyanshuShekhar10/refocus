import rss from "@astrojs/rss";
import type { APIContext } from "astro";
import { getCollection } from "astro:content";
import { SITE_URL } from "../lib/seo";

export async function GET(context: APIContext) {
  const posts = (await getCollection("blog", ({ data }) => !data.draft)).sort(
    (a, b) => +new Date(b.data.pubDate) - +new Date(a.data.pubDate),
  );

  return rss({
    title: "Refocus Blog",
    description:
      "Practical notes on deep work, ADHD-friendly focus, competitive exam prep, studying alone, and remote work.",
    site: context.site?.toString() ?? SITE_URL,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: new Date(post.data.pubDate),
      link: `/blog/${post.id}`,
      categories: [post.data.category, ...(post.data.tags ?? [])],
    })),
    customData: `<language>en</language>`,
  });
}
