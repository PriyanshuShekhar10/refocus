import type { APIRoute } from "astro";
import { getCollection } from "astro:content";

const site = "https://refocus.co.in";

type Entry = {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
};

export const GET: APIRoute = async () => {
  const posts = await getCollection("blog", ({ data }) => !data.draft);

  const staticEntries: Entry[] = [
    { loc: `${site}/`, changefreq: "weekly", priority: "1.0" },
    { loc: `${site}/blog`, changefreq: "daily", priority: "0.8" },
    { loc: `${site}/about`, changefreq: "monthly", priority: "0.6" },
    { loc: `${site}/career`, changefreq: "monthly", priority: "0.6" },
    { loc: `${site}/privacy`, changefreq: "yearly", priority: "0.3" },
    { loc: `${site}/terms`, changefreq: "yearly", priority: "0.3" },
  ];

  const postEntries: Entry[] = posts.map((post) => ({
    loc: `${site}/blog/${post.id}`,
    lastmod: new Date(
      post.data.updatedDate ?? post.data.pubDate,
    ).toISOString(),
    changefreq: "monthly",
    priority: "0.7",
  }));

  const entries = [...staticEntries, ...postEntries];

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${e.loc}</loc>
${e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>\n` : ""}    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
