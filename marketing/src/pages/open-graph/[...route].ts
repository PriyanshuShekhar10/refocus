import { OGImageRoute } from "astro-og-canvas";
import { getCollection } from "astro:content";
import { categoryLabel } from "../../lib/categories";

const posts = await getCollection("blog", ({ data }) => !data.draft);

// key -> data used to render each image. Keys become `/open-graph/<key>.png`.
const pages = Object.fromEntries(
  posts.map((post) => [
    post.id,
    {
      title: post.data.title,
      description: post.data.description,
      category: post.data.category,
    },
  ]),
);

export const { getStaticPaths, GET } = await OGImageRoute({
  param: "route",
  pages,
  getImageOptions: (_path, page: (typeof pages)[string]) => ({
    title: page.title,
    description: `${categoryLabel(page.category)} · Refocus`,
    logo: { path: "./public/icon1.png", size: [72] as [number] },
    bgGradient: [
      [11, 11, 15],
      [24, 24, 40],
    ],
    border: { color: [79, 70, 229], width: 12, side: "inline-start" },
    padding: 72,
    font: {
      title: { color: [245, 245, 245], size: 64, lineHeight: 1.15 },
      description: { color: [150, 150, 160], size: 30 },
    },
  }),
});
