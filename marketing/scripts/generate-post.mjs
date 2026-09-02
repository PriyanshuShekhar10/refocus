#!/usr/bin/env node
/**
 * Generate a niche blog post for the Refocus marketing site (OpenAI).
 *
 * Usage:
 *   node scripts/generate-post.mjs
 *   node scripts/generate-post.mjs --category exams
 *   node scripts/generate-post.mjs --category exams --locale id
 *
 * Env:
 *   OPENAI_API_KEY   (required)
 *   OPENAI_MODEL     (optional, default gpt-4o-mini)
 *   POST_CATEGORY    (optional)  — productivity | adhd | exams | loneliness | remote
 *   POST_TOPIC       (optional)  — override the topic angle
 *   POST_LOCALE      (optional)  — en (default) | id
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
  COMMERCIAL_HUBS,
  getCategory,
  isFreeCommercialTopic,
  pickCategoryByUtcHour,
} from "./blog-categories.mjs";
import { CATEGORIES_ID, getCategoryId } from "./blog-categories-id.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MARKETING_DIR = resolve(__dirname, "..");
const REPO_ROOT = resolve(MARKETING_DIR, "..");

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const SITE = "https://refocus.co.in";

function resolveLocale() {
  const raw = (getArg("--locale") || process.env.POST_LOCALE || "en")
    .trim()
    .toLowerCase();
  if (raw === "id") return "id";
  return "en";
}

function blogDirForLocale(locale) {
  return locale === "id"
    ? join(MARKETING_DIR, "src/content/blog-id")
    : join(MARKETING_DIR, "src/content/blog");
}

function blogUrlPrefix(locale) {
  return locale === "id" ? "/id/blog" : "/blog";
}

/**
 * Cluster landing pages every niche can reference. Each niche's own `pillar`
 * page (see blog-categories.mjs) MUST be linked once in-body; the others are
 * optional related internal pages.
 */
const LANDING_PAGES = [
  "/body-doubling — What body doubling is and how to do it online",
  "/virtual-coworking — Virtual coworking for remote/solo focus",
  "/study-with-me — Study-with-me online study rooms for exam prep",
  "/pricing — Free period pricing (no card, no weekly session cap)",
  "/free — Short free-period campaign summary",
  "/focusmate-alternative — Honest Refocus vs Focusmate comparison",
];

const LANDING_PAGES_ID = [
  "/id/body-doubling — Panduan body doubling online",
  "/id/virtual-coworking — Coworking virtual untuk fokus",
  "/id/study-with-me — Belajar bersama online untuk persiapan ujian",
  "/id/pricing — Harga periode gratis Refocus",
  "/id/features — Fitur Refocus",
];

/** Absolute URL of the pillar page for a category. */
function pillarUrl(category, locale) {
  const path = category.pillar?.path || (locale === "id" ? "/id/body-doubling" : "/body-doubling");
  return `${SITE}${path.startsWith("/") ? path : `/${path}`}`;
}

function landingPages(locale) {
  return locale === "id" ? LANDING_PAGES_ID : LANDING_PAGES;
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

function resolveCategoryId(locale) {
  const fromArg = getArg("--category") || process.env.POST_CATEGORY || "";
  if (fromArg) {
    const cat =
      locale === "id" ? getCategoryId(fromArg) : getCategory(fromArg);
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

function categoriesForLocale(locale) {
  return locale === "id" ? CATEGORIES_ID : CATEGORIES;
}

/** Topic keywords that must not repeat across recent posts in the same locale. */
const TOPIC_KEYWORDS = [
  "utbk",
  "snbt",
  "tryout",
  "seleksi",
  "body doubling",
  "body-doubling",
  "coworking",
  "focusmate",
  "adhd",
  "freelancer",
  "wfh",
  "isolasi",
  "kesepian",
  "study with me",
  "upsc",
  "prelims",
  "mains",
  "neet",
  "jee",
];

function topicKeywords(text) {
  const lower = text.toLowerCase();
  return TOPIC_KEYWORDS.filter((kw) => lower.includes(kw));
}

function topicClashes(candidate, existingTexts) {
  const keys = topicKeywords(candidate);
  if (keys.length === 0) return false;
  return existingTexts.some((existing) => {
    const existingKeys = topicKeywords(existing);
    return keys.some((k) => existingKeys.includes(k));
  });
}

function pickTopic(category, existingTexts) {
  const forced =
    getArg("--topic") || process.env.POST_TOPIC?.trim() || "";
  if (forced) {
    if (topicClashes(forced, existingTexts)) {
      throw new Error(
        `Topic "${forced}" overlaps an existing post keyword — pick a different angle.`,
      );
    }
    return forced;
  }

  const pool = category.topics;
  const seed = Date.now() + Math.floor(Math.random() * 1000);
  const start = seed % pool.length;
  for (let k = 0; k < pool.length; k++) {
    const candidate = pool[(start + k) % pool.length];
    if (!topicClashes(candidate, existingTexts)) return candidate;
  }
  throw new Error(
    `No unused topic angle left in ${category.id} — expand the pool or retire overlapping posts.`,
  );
}

async function getExistingMeta(blogDir, urlPrefix) {
  if (!existsSync(blogDir)) {
    return { titles: [], urls: [], slugs: [], categories: [], dedupTexts: [] };
  }
  const files = (await readdir(blogDir)).filter((f) => f.endsWith(".md"));
  const titles = [];
  const urls = [];
  const slugs = [];
  const categories = [];
  const dedupTexts = [];
  for (const f of files) {
    const slug = f.replace(/\.md$/, "");
    const raw = await readFile(join(blogDir, f), "utf8");
    const titleM = raw.match(/^title:\s*(.+)$/m);
    const catM = raw.match(/^category:\s*(.+)$/m);
    const title = titleM
      ? titleM[1].replace(/^["']|["']$/g, "").trim()
      : slug;
    const cat = catM
      ? catM[1].replace(/^["']|["']$/g, "").trim()
      : "productivity";
    titles.push(title);
    slugs.push(slug);
    categories.push(cat);
    dedupTexts.push(`${title} ${slug} ${cat}`);
    urls.push(`${SITE}${urlPrefix}/${slug}`);
  }
  return { titles, urls, slugs, categories, dedupTexts };
}

/** Prefer the niche with the fewest posts when rotating by slot (reduces pile-up). */
function pickCategoryBySlot(slot, locale, categoriesMap, existingCategories) {
  const ids = CATEGORY_IDS;
  const counts = Object.fromEntries(ids.map((id) => [id, 0]));
  for (const c of existingCategories) {
    if (counts[c] !== undefined) counts[c]++;
  }
  const sorted = [...ids].sort((a, b) => counts[a] - counts[b] || a.localeCompare(b));
  const DAY = Math.floor(Date.now() / 86400000);
  const slotNum = Number(slot) || 0;
  const offset = (DAY + slotNum) % sorted.length;
  return sorted[offset];
}

async function uniqueSlug(blogDir, slug, existingSlugs = []) {
  const base = slug || "post";
  const words = base.split("-").filter((w) => w.length > 3);
  const tooSimilar = existingSlugs.some((s) => {
    const sw = s.split("-").filter((w) => w.length > 3);
    const overlap = words.filter((w) => sw.includes(w)).length;
    return overlap >= 2;
  });
  if (tooSimilar) {
    throw new Error(
      `Slug "${base}" is too similar to an existing post — use a clearly different angle.`,
    );
  }
  if (!existsSync(join(blogDir, `${base}.md`))) return base;

  const stamp = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "");
  const angled = `${base}-${stamp}`;
  if (!existsSync(join(blogDir, `${angled}.md`))) {
    console.warn(
      `Slug "${base}" already exists — using dated slug "${angled}" instead of -2.`,
    );
    return angled;
  }

  throw new Error(
    `Slug collision for "${base}" (and dated fallback). Pick a clearly different title/slug — do not publish near-duplicates.`,
  );
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

const LINK_BANK_ID = {
  productivity: [
    "https://id.wikipedia.org/wiki/Manajemen_waktu — manajemen waktu",
    "https://www.kompas.com/tag/produktivitas — Kompas (produktivitas)",
  ],
  adhd: [
    "https://id.wikipedia.org/wiki/Gangguan_belahan_otak_dengan_hipertivitas — ADHD (Wikipedia ID)",
  ],
  exams: [
    "https://snbt.kemdikbud.go.id/ — SNBT resmi Kemdikbud",
    "https://utbk-sbmptn.id/ — informasi UTBK/SBMPTN",
    "https://id.wikipedia.org/wiki/Seleksi_Bersama_Masuk_Perguruan_Tinggi_Negeri — SBMP TN",
  ],
  loneliness: [
    "https://id.wikipedia.org/wiki/Kesepian — kesepian",
  ],
  remote: [
    "https://id.wikipedia.org/wiki/Kerja_jarak_jauh — kerja jarak jauh",
    "https://www.kompas.com/tag/freelancer — Kompas freelancer",
  ],
};

function linkBank(categoryId, locale) {
  if (locale === "id") {
    return LINK_BANK_ID[categoryId] || LINK_BANK_ID.productivity;
  }
  return LINK_BANK[categoryId] || LINK_BANK.productivity;
}

function buildSystemPrompt(category, topic, locale) {
  const freeCommercial = isFreeCommercialTopic(topic);
  const pricingPath = locale === "id" ? "/id/pricing" : "/pricing";
  const freePath = locale === "id" ? "/id/features" : "/free";
  const altPath = locale === "id" ? "/id/features" : "/focusmate-alternative";
  const commercialRule = freeCommercial
    ? `5b. COMMERCIAL HUB LINK (required for this free/pricing/alternative topic): also include EXACTLY ONE Markdown link to one of these pages — ${SITE}${pricingPath}; ${SITE}${freePath}; ${SITE}${altPath}. Place it naturally mid-article.`
    : `5b. COMMERCIAL HUB LINK (optional): if you mention free tools or pricing, you MAY add one link to ${SITE}${pricingPath}. Otherwise omit.`;

  const langRule =
    locale === "id"
      ? "Write the ENTIRE article in natural Bahasa Indonesia. Do NOT mention JEE, UPSC, NEET, or Indian exams. Use UTBK/SNBT/Indonesia context for exam niche."
      : "Write in English for an India-primary audience. UPSC-first for exam niche; avoid JEE-heavy angles unless the topic requires it.";

  const bank = linkBank(category.id, locale);

  return `You write SEO-friendly, genuinely useful long-form articles. Readers should leave with tactics they can use today — even if they never hear of any product.

${langRule}

Niche for this article: ${category.label}
Audience: ${category.audience}
Voice: ${category.voice}

Hard requirements:
1. TITLE: specific and searchable. No brand names in the title unless comparing publicly known tools (Focusmate, Discord, Zoom).
2. Do NOT pitch or center any product as the whole article. Soft product mentions allowed only as instructed below.
3. OUTBOUND LINKS: include 3–5 Markdown links to real external resources. Prefer:
${bank.map((l) => `   - ${l}`).join("\n")}
4. OPTIONAL soft tool mention: You MAY mention Refocus (${SITE}) at most ONCE, mid-article, as a quiet example of virtual body doubling — never in title or intro.
5. INTERNAL LINK (required): include EXACTLY ONE Markdown link to ${pillarUrl(category, locale)}, placed naturally high in the article as further reading.
${commercialRule}
6. Must include: ${category.mustInclude}
7. Avoid: ${category.avoid}
8. Structure: Markdown with 3–5 "##" headings, ~900–1200 words. No emojis. No "In conclusion".
9. Be specific: name exams, tools, routines. Vague motivational writing is a failure.`;
}

function buildUserPrompt(category, topic, existingTitles, existingUrls, locale) {
  const avoidTitles =
    existingTitles.length > 0
      ? `\n\nAlready published titles — pick a clearly different angle:\n${existingTitles
          .slice(0, 40)
          .map((t) => `- ${t}`)
          .join("\n")}`
      : "";
  const internal =
    existingUrls.length > 0
      ? `\n\nIf natural, you may add 0–1 internal link to a related older post:\n${existingUrls
          .slice(0, 8)
          .map((u) => `- ${u}`)
          .join("\n")}`
      : "";
  const landing = `\n\nRequired internal link — link to this guide exactly once, high in the article:\n- ${pillarUrl(category, locale)}\nOther related internal pages:\n${landingPages(locale).map((p) => `- ${SITE}${p.split(" — ")[0]}`).join("\n")}`;

  const lang =
    locale === "id"
      ? "Write in Bahasa Indonesia."
      : "Write in English.";

  return `${lang} Write a blog post in the "${category.label}" niche about: ${topic}.${avoidTitles}${landing}${internal}

Return ONLY JSON:
{
  "title": "specific, searchable, under 70 chars, no brand",
  "slug": "kebab-case-url-slug",
  "description": "meta description under 155 chars",
  "tags": ["2-5", "lowercase", "tags"],
  "body_markdown": "full Markdown body (no H1). Must include 3-5 outbound https links."
}`;
}

async function callOpenAI(
  apiKey,
  category,
  topic,
  existingTitles,
  existingUrls,
  locale,
) {
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
        { role: "system", content: buildSystemPrompt(category, topic, locale) },
        {
          role: "user",
          content: buildUserPrompt(
            category,
            topic,
            existingTitles,
            existingUrls,
            locale,
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
function ensurePillarLink(body, category, locale) {
  const path = category.pillar?.path || (locale === "id" ? "/id/body-doubling" : "/body-doubling");
  const label = category.pillar?.label || "body doubling";
  const linksPillar = new RegExp(
    `\\]\\((?:${SITE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})?${path.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    )}(?:[)#/?]|$)`,
    "i",
  ).test(body);
  if (linksPillar) return body;

  const sentence =
    locale === "id"
      ? `Jika baru mengenal konsep ini, baca [panduan ${label}](${SITE}${path}) kami.`
      : `If you're new to the idea, see our guide to [${label}](${SITE}${path}).`;
  const paras = body.split(/\n{2,}/);
  // Insert after the first non-heading paragraph so it sits high in the article.
  const idx = paras.findIndex((p) => p.trim() && !p.trim().startsWith("#"));
  if (idx === -1) return `${sentence}\n\n${body}`;
  paras.splice(idx + 1, 0, sentence);
  return paras.join("\n\n");
}

function toFrontmatter({ title, description, tags, category, locale }) {
  const pubDate = new Date().toISOString();
  const q = (s) => JSON.stringify(String(s));
  const tagList = Array.isArray(tags) ? tags : [];
  if (!tagList.map((t) => String(t).toLowerCase()).includes(category.id)) {
    tagList.unshift(category.id);
  }
  const localeLine =
    locale === "id" ? `\nlocale: ${q("id")}` : "";
  return `---
title: ${q(title)}
description: ${q(description)}
pubDate: ${q(pubDate)}
category: ${q(category.id)}
tags: [${tagList.map((t) => q(t)).join(", ")}]
author: ${q(locale === "id" ? "Tim Refocus" : "Refocus Team")}${localeLine}
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

  const locale = resolveLocale();
  const blogDir = blogDirForLocale(locale);
  const urlPrefix = blogUrlPrefix(locale);
  const categoryId = resolveCategoryId(locale);
  const allCategories = categoriesForLocale(locale);
  const category = allCategories[categoryId];
  const { titles: existingTitles, urls: existingUrls, slugs: existingSlugs, dedupTexts } =
    await getExistingMeta(blogDir, urlPrefix);
  const topic = pickTopic(category, dedupTexts);

  console.log(`Locale: ${locale}`);
  console.log(`Category: ${category.id} (${category.label})`);
  console.log(`Topic: ${topic}`);
  console.log(`Model: ${MODEL}`);

  const result = await callOpenAI(
    apiKey,
    category,
    topic,
    existingTitles,
    existingUrls,
    locale,
  );

  const title = sanitizeTitle(result.title || "");
  if (!title) throw new Error("Model did not return a usable title.");
  const description = String(result.description || "").slice(0, 160);
  let body = String(result.body_markdown || "").trim();
  if (body.length < 200) throw new Error("Model returned an empty/short body.");
  body = ensureOutboundLinks(body, category.id);
  body = ensurePillarLink(body, category, locale);

  const outbound = countOutboundLinks(body);
  console.log(`Outbound links (non-Refocus): ${outbound}`);
  console.log(`Pillar link: ${pillarUrl(category, locale)}`);

  const baseSlug = slugify(result.slug || title);
  const slug = await uniqueSlug(blogDir, baseSlug, existingSlugs);

  const contents = `${toFrontmatter({
    title,
    description,
    tags: result.tags,
    category,
    locale,
  })}\n${body}\n`;
  const outPath = join(blogDir, `${slug}.md`);
  await writeFile(outPath, contents, "utf8");

  console.log(`\nWrote ${outPath}`);
  console.log(`Title: ${title}`);
  console.log(`URL:   ${SITE}${urlPrefix}/${slug}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
