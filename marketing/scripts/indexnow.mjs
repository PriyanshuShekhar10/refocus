/**
 * Ping IndexNow (Bing, Yandex, Seznam, Naver…) with recently changed URLs so
 * new and updated pages get indexed in hours — Bing's index also feeds
 * ChatGPT search and Copilot. Reads lastmod from the built sitemap.
 *
 *   node scripts/indexnow.mjs [--hours 48]
 */
import { readFile } from "node:fs/promises";

const HOST = "refocus.co.in";
const KEY = "e207bf232060ebe4f39636a5efe75c59"; // public/<KEY>.txt proves ownership; not a secret
const hoursArg = process.argv.indexOf("--hours");
const HOURS = hoursArg > -1 ? Number(process.argv[hoursArg + 1]) : 48;

const xml = await readFile(new URL("../dist/sitemap.xml", import.meta.url), "utf8");
const since = Date.now() - HOURS * 60 * 60 * 1000;
const urls = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
  .map(([, block]) => ({
    loc: block.match(/<loc>([^<]+)<\/loc>/)?.[1],
    lastmod: block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1],
  }))
  .filter((u) => u.loc && u.lastmod && Date.parse(u.lastmod) >= since)
  .map((u) => u.loc);

if (urls.length === 0) {
  console.log(`IndexNow: no URLs changed in the last ${HOURS}h`);
  process.exit(0);
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: `https://${HOST}/${KEY}.txt`,
    urlList: urls.slice(0, 10000),
  }),
});
console.log(`IndexNow: submitted ${urls.length} URL(s) → HTTP ${res.status}`);
// Never fail the deploy over a ping.
