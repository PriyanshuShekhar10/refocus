import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { SITE_URL } from "../lib/seo";
import { CATEGORY_IDS } from "../lib/categories";

const site = SITE_URL;

type Entry = {
  loc: string;
  lastmod?: string;
  changefreq: string;
  priority: string;
};

const PAGE_SIZE = 12;

export const GET: APIRoute = async () => {
  const posts = await getCollection("blog", ({ data }) => !data.draft);

  const latestPost = posts
    .map((p) => +new Date(p.data.updatedDate ?? p.data.pubDate))
    .sort((a, b) => b - a)[0];
  const blogLastmod = latestPost
    ? new Date(latestPost).toISOString()
    : new Date().toISOString();

  const staticEntries: Entry[] = [
    {
      loc: `${site}/`,
      lastmod: new Date().toISOString(),
      changefreq: "weekly",
      priority: "1.0",
    },
    {
      loc: `${site}/blog`,
      lastmod: blogLastmod,
      changefreq: "daily",
      priority: "0.8",
    },
    // Core product pages.
    {
      loc: `${site}/features`,
      lastmod: new Date().toISOString(),
      changefreq: "monthly",
      priority: "0.9",
    },
    {
      loc: `${site}/pricing`,
      lastmod: new Date().toISOString(),
      changefreq: "monthly",
      priority: "0.9",
    },
    // Topic-cluster landing pages.
    { loc: `${site}/body-doubling`, changefreq: "monthly", priority: "0.8" },
    { loc: `${site}/virtual-coworking`, changefreq: "monthly", priority: "0.8" },
    { loc: `${site}/study-with-me`, changefreq: "monthly", priority: "0.8" },
    { loc: `${site}/focus-room`, changefreq: "monthly", priority: "0.8" },
    { loc: `${site}/study-partner`, changefreq: "monthly", priority: "0.8" },
    // Competitor comparison / alternative pages.
    { loc: `${site}/focusmate-alternative`, changefreq: "monthly", priority: "0.7" },
    { loc: `${site}/flown-alternative`, changefreq: "monthly", priority: "0.7" },
    { loc: `${site}/cofocus-alternative`, changefreq: "monthly", priority: "0.7" },
    { loc: `${site}/about`, changefreq: "monthly", priority: "0.6" },
    { loc: `${site}/privacy`, changefreq: "yearly", priority: "0.3" },
    { loc: `${site}/terms`, changefreq: "yearly", priority: "0.3" },
  ];

  // Paginated blog listing pages (page 1 lives at /blog above).
  const pageCount = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  const paginationEntries: Entry[] = Array.from(
    { length: pageCount - 1 },
    (_, i) => ({
      loc: `${site}/blog/${i + 2}`,
      changefreq: "weekly",
      priority: "0.4",
    }),
  );

  // Category archive pages.
  const categoryEntries: Entry[] = CATEGORY_IDS.map((id) => ({
    loc: `${site}/blog/category/${id}`,
    changefreq: "weekly",
    priority: "0.6",
  }));

  const postEntries: Entry[] = posts.map((post) => ({
    loc: `${site}/blog/${post.id}`,
    lastmod: new Date(
      post.data.updatedDate ?? post.data.pubDate,
    ).toISOString(),
    changefreq: "monthly",
    priority: "0.7",
  }));

  const entries = [
    ...staticEntries,
    ...categoryEntries,
    ...paginationEntries,
    ...postEntries,
  ];

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
