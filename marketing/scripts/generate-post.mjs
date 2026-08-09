#!/usr/bin/env node
/**
 * Generate a niche blog post for the Refocus marketing site (OpenAI).
 *
 * Usage:
 *   node scripts/generate-post.mjs
 *   node scripts/generate-post.mjs --category exams
 *   node scripts/generate-post.mjs --category adhd --topic "body doubling for study"
 *
 * Env:
 *   OPENAI_API_KEY   (required)
 *   OPENAI_MODEL     (optional, default gpt-4o-mini)
 *   POST_CATEGORY    (optional)  — productivity | adhd | exams | loneliness | remote
 *   POST_TOPIC       (optional)  — override the topic angle
 *
 * SEO / usefulness goals (not hard promotion):
 *   - Specific, niche angles (exams, ADHD, loneliness, etc.)
 *   - Multiple outbound links to real, useful resources
 *   - At most one soft Refocus mention mid-article (never the title)
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CATEGORIES,
  CATEGORY_IDS,
  getCategory,
  pickCategoryByUtcHour,
} from "./blog-categories.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MARKETING_DIR = resolve(__dirname, "..");
const REPO_ROOT = resolve(MARKETING_DIR, "..");
const BLOG_DIR = join(MARKETING_DIR, "src/content/blog");

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const SITE = "https://refocus.co.in";

/**
 * Cluster landing pages every niche can reference. Each niche's own `pillar`
 * page (see blog-categories.mjs) MUST be linked once in-body; the others are
 * optional related internal pages.
 */
const LANDING_PAGES = [
  "/body-doubling — What body doubling is and how to do it online",
  "/virtual-coworking — Virtual coworking for remote/solo focus",
  "/study-with-me — Study-with-me online study rooms for exam prep",
];

/** Absolute URL of the pillar page for a category. */
function pillarUrl(category) {
  return `${SITE}${category.pillar?.path || "/body-doubling"}`;
}

async function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const raw = await readFile(path, "utf8");
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key]) continue;
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

function slugify(input) {
  return input
    .toLowerCase()
    .replace(/['"’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70)
    .replace(/-+$/g, "");
}

function getArg(flag) {
  const argv = process.argv.slice(2);
  const i = argv.indexOf(flag);
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  return "";
}

function resolveCategoryId() {
  const fromArg = getArg("--category") || process.env.POST_CATEGORY || "";
  if (fromArg) {
    const cat = getCategory(fromArg);
    if (!cat) {
      console.error(
        `Unknown category "${fromArg}". Use one of: ${CATEGORY_IDS.join(", ")}`,
      );
      process.exit(1);
    }
    return cat.id;
  }
  return pickCategoryByUtcHour();
}

function pickTopic(category, existingTitles) {
  const forced =
    getArg("--topic") || process.env.POST_TOPIC?.trim() || "";
  if (forced) return forced;

  const pool = category.topics;
  const seed = Date.now() + Math.floor(Math.random() * 1000);
  const start = seed % pool.length;
  for (let k = 0; k < pool.length; k++) {
    const candidate = pool[(start + k) % pool.length];
    const key = candidate.split(" ").slice(0, 4).join(" ").toLowerCase();
    const clash = existingTitles.some((t) =>
      t.toLowerCase().includes(key.slice(0, 24)),
    );
    if (!clash) return candidate;
  }
  return pool[start];
}

async function getExistingMeta() {
  if (!existsSync(BLOG_DIR)) return { titles: [], urls: [] };
  const files = (await readdir(BLOG_DIR)).filter((f) => f.endsWith(".md"));
  const titles = [];
  const urls = [];
  for (const f of files) {
    const raw = await readFile(join(BLOG_DIR, f), "utf8");
    const m = raw.match(/^title:\s*(.+)$/m);
    if (m) titles.push(m[1].replace(/^["']|["']$/g, "").trim());
    urls.push(`${SITE}/blog/${f.replace(/\.md$/, "")}`);
  }
  return { titles, urls };
}

async function uniqueSlug(slug) {
  let candidate = slug || "post";
  let n = 2;
  while (existsSync(join(BLOG_DIR, `${candidate}.md`))) {
    candidate = `${slug}-${n++}`;
  }
  return candidate;
}

/** Suggested outbound sources the model may link — real, useful sites. */
const LINK_BANK = {
  productivity: [
    "https://www.calnewport.com/blog/ — Deep Work / Cal Newport",
    "https://todoist.com/productivity-methods/pomodoro-technique — Pomodoro overview",
    "https://jamesclear.com/atomic-habits — habit design (Atomic Habits)",
    "https://en.wikipedia.org/wiki/Time_management — time management overview",
    "https://www.apa.org/topics/stress — APA on stress / overload",
  ],
  adhd: [
    "https://www.cdc.gov/adhd/ — CDC ADHD overview",
    "https://chadd.org/ — CHADD (ADHD education & support)",
    "https://www.nimh.nih.gov/health/topics/attention-deficit-hyperactivity-disorder-adhd — NIMH ADHD",
    "https://add.org/ — ADDA",
    "https://en.wikipedia.org/wiki/Body_doubling — body doubling (concept)",
    "https://www.understood.org/ — Understood.org (learning & attention)",
  ],
  exams: [
    "https://upsc.gov.in/ — UPSC official",
    "https://jeemain.nta.nic.in/ — JEE Main (NTA)",
    "https://neet.nta.nic.in/ — NEET (NTA)",
    "https://iimcat.ac.in/ — CAT",
    "https://gate.iitk.ac.in/ — GATE (example host IIT)",
    "https://www.icai.org/ — ICAI (CA)",
    "https://exams.nta.ac.in/CUET-UG/ — CUET",
    "https://www.ets.org/gre.html — GRE",
    "https://www.mba.com/exams/gmat — GMAT",
    "https://cbse.gov.in/ — CBSE boards",
  ],
  loneliness: [
    "https://www.cdc.gov/emotional-wellbeing/social-connectedness/index.htm — CDC social connectedness",
    "https://www.apa.org/monitor/2019/05/ce-corner-isolation — APA on loneliness",
    "https://en.wikipedia.org/wiki/Loneliness — loneliness overview",
    "https://www.mind.org.uk/information-support/tips-for-everyday-living/loneliness/about-loneliness/ — Mind UK on loneliness",
  ],
  remote: [
    "https://www.buffer.com/state-of-remote-work — State of Remote Work (Buffer)",
    "https://www.oecd.org/employment/future-of-work/ — OECD future of work",
    "https://www.ilo.org/topics/telework — ILO telework",
    "https://sloanreview.mit.edu/ — MIT Sloan (remote / knowledge work articles)",
    "https://en.wikipedia.org/wiki/Remote_work — remote work overview",
  ],
};

function buildSystemPrompt(category) {
  return `You write SEO-friendly, genuinely useful long-form articles. Readers should leave with tactics they can use today — even if they never hear of any product.

Niche for this article: ${category.label}
Audience: ${category.audience}
Voice: ${category.voice}

Hard requirements:
1. TITLE: specific and searchable. No brand names. Prefer including a concrete exam, situation, or named tactic when the niche calls for it.
2. Do NOT pitch or center any product. The article must stand alone as useful content.
3. OUTBOUND LINKS (critical for usefulness + SEO): include 3–5 Markdown links to real external resources (official sites, reputable orgs, well-known references). Prefer links from this bank when they fit, and only use real https URLs you are confident exist:
${(LINK_BANK[category.id] || LINK_BANK.productivity).map((l) => `   - ${l}`).join("\n")}
   Spread links through the article (not dumped at the end). Anchor text should be natural ("NTA's JEE Main site", "CHADD's ADHD overview"), not "click here".
4. OPTIONAL soft tool mention: You MAY mention Refocus (https://refocus.co.in) at most ONCE, mid-article, as a quiet example of virtual body doubling / co-working — never in the title or intro, never as a CTA, never more than 1–2 sentences. If the article is stronger without it, omit Refocus entirely.
5. INTERNAL LINK (required): include EXACTLY ONE Markdown link to our guide at ${pillarUrl(category)}, placed naturally high in the article (within the first few paragraphs) as "further reading", with descriptive anchor text (e.g. "our guide to ${category.pillar?.label || "body doubling"}"). This is an internal reference, not a CTA, and does NOT count toward the 3–5 outbound links above. Do not link it more than once.
6. Must include: ${category.mustInclude}
7. Avoid: ${category.avoid}
8. Structure: Markdown with 3–5 "##" headings, short paragraphs, occasional lists. ~900–1200 words. No emojis. No "In conclusion". No invented statistics or fake studies.
9. Be specific: name exams, tools, routines, times of day, failure modes. Vague motivational writing is a failure.`;
}

function buildUserPrompt(category, topic, existingTitles, existingUrls) {
  const avoidTitles =
    existingTitles.length > 0
      ? `\n\nAlready published titles — pick a clearly different angle:\n${existingTitles
          .slice(0, 40)
          .map((t) => `- ${t}`)
          .join("\n")}`
      : "";
  const internal =
    existingUrls.length > 0
      ? `\n\nIf natural, you may add 0–1 internal link to a related older post on our site (same niche feel):\n${existingUrls
          .slice(0, 8)
          .map((u) => `- ${u}`)
          .join("\n")}`
      : "";
  const landing = `\n\nRequired internal link — link to this guide exactly once, high in the article, as further reading:\n- ${pillarUrl(category)}\nOther related internal pages you MAY link if genuinely relevant:\n${LANDING_PAGES.map((p) => `- ${SITE}${p}`).join("\n")}`;

  return `Write a blog post in the "${category.label}" niche about: ${topic}.${avoidTitles}${landing}${internal}

Return ONLY JSON with these keys:
{
  "title": "specific, searchable, under 70 chars, no brand",
  "slug": "kebab-case-url-slug",
  "description": "meta description under 155 chars, specific",
  "tags": ["2-5", "lowercase", "tags"],
  "body_markdown": "full Markdown body (no H1). Must include 3-5 outbound https links."
}`;
}

async function callOpenAI(apiKey, category, topic, existingTitles, existingUrls) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.85,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: buildSystemPrompt(category) },
        {
          role: "user",
          content: buildUserPrompt(
            category,
            topic,
            existingTitles,
            existingUrls,
          ),
        },
      ],
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("OpenAI returned no content.");
  return JSON.parse(content);
}

function sanitizeTitle(title) {
  return title
    .replace(/\brefocus\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s:–-]+|[\s:–-]+$/g, "")
    .trim();
}

function countOutboundLinks(body) {
  const matches = body.match(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g) || [];
  return matches.filter((m) => !/refocus\.co\.in/i.test(m)).length;
}

function ensureOutboundLinks(body, categoryId) {
  if (countOutboundLinks(body) >= 3) return body;

  // Fallback: append a short "Further reading" section with bank links.
  const bank = LINK_BANK[categoryId] || LINK_BANK.productivity;
  const picks = bank.slice(0, 4);
  const lines = picks.map((entry) => {
    const url = entry.split(" — ")[0].trim();
    const label = entry.split(" — ")[1]?.trim() || url;
    return `- [${label}](${url})`;
  });
  return `${body.trim()}\n\n## Further reading\n\n${lines.join("\n")}\n`;
}

/**
 * Guarantee exactly one in-body internal link to the category's pillar page.
 * If the model omitted it, inject a natural "further reading" line after the
 * first paragraph. Internal links don't count toward the outbound requirement.
 */
function ensurePillarLink(body, category) {
  const path = category.pillar?.path || "/body-doubling";
  const label = category.pillar?.label || "body doubling";
  // Already links the pillar (relative or absolute)? Leave it alone.
  const linksPillar = new RegExp(
    `\\]\\((?:${SITE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})?${path.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    )}(?:[)#/?]|$)`,
    "i",
  ).test(body);
  if (linksPillar) return body;

  const sentence = `If you're new to the idea, see our guide to [${label}](${SITE}${path}).`;
  const paras = body.split(/\n{2,}/);
  // Insert after the first non-heading paragraph so it sits high in the article.
  const idx = paras.findIndex((p) => p.trim() && !p.trim().startsWith("#"));
  if (idx === -1) return `${sentence}\n\n${body}`;
  paras.splice(idx + 1, 0, sentence);
  return paras.join("\n\n");
}

function toFrontmatter({ title, description, tags, category }) {
  const pubDate = new Date().toISOString();
  const q = (s) => JSON.stringify(String(s));
  const tagList = Array.isArray(tags) ? tags : [];
  // Ensure category id is among tags for listing filters.
  if (!tagList.map((t) => String(t).toLowerCase()).includes(category.id)) {
    tagList.unshift(category.id);
  }
  return `---
title: ${q(title)}
description: ${q(description)}
pubDate: ${q(pubDate)}
category: ${q(category.id)}
tags: [${tagList.map((t) => q(t)).join(", ")}]
author: ${q("Refocus Team")}
draft: false
---
`;
}

async function main() {
  await loadEnvFile(join(REPO_ROOT, ".env"));
  await loadEnvFile(join(MARKETING_DIR, ".env"));

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error(
      "Missing OPENAI_API_KEY. Set it in the repo-root .env or the environment.",
    );
    process.exit(1);
  }

  const categoryId = resolveCategoryId();
  const category = CATEGORIES[categoryId];
  const { titles: existingTitles, urls: existingUrls } =
    await getExistingMeta();
  const topic = pickTopic(category, existingTitles);

  console.log(`Category: ${category.id} (${category.label})`);
  console.log(`Topic: ${topic}`);
  console.log(`Model: ${MODEL}`);

  const result = await callOpenAI(
    apiKey,
    category,
    topic,
    existingTitles,
    existingUrls,
  );

  const title = sanitizeTitle(result.title || "");
  if (!title) throw new Error("Model did not return a usable title.");
  const description = String(result.description || "").slice(0, 160);
  let body = String(result.body_markdown || "").trim();
  if (body.length < 200) throw new Error("Model returned an empty/short body.");
  body = ensureOutboundLinks(body, category.id);
  body = ensurePillarLink(body, category);

  const outbound = countOutboundLinks(body);
  console.log(`Outbound links (non-Refocus): ${outbound}`);
  console.log(`Pillar link: ${pillarUrl(category)}`);

  const baseSlug = slugify(result.slug || title);
  const slug = await uniqueSlug(baseSlug);

  const contents = `${toFrontmatter({
    title,
    description,
    tags: result.tags,
    category,
  })}\n${body}\n`;
  const outPath = join(BLOG_DIR, `${slug}.md`);
  await writeFile(outPath, contents, "utf8");

  console.log(`\nWrote ${outPath}`);
  console.log(`Title: ${title}`);
  console.log(`URL:   ${SITE}/blog/${slug}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
