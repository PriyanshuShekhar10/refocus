#!/usr/bin/env node
/**
 * Generate a niche blog post for the Refocus marketing site (OpenAI).
 *
 * Usage:
 *   node scripts/generate-post.mjs
 *   node scripts/generate-post.mjs --category exams --locale id
 *   node scripts/generate-post.mjs --category exams --locale fil
 *   node scripts/generate-post.mjs --category remote --locale vi
 *
 * Locales: en | id | fil | vi
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CATEGORY_IDS,
  COMMERCIAL_HUBS,
  isFreeCommercialTopic,
} from "./blog-categories.mjs";
import {
  LOCALE_IDS,
  resolveLocaleConfig,
} from "./locale-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MARKETING_DIR = resolve(__dirname, "..");
const REPO_ROOT = resolve(MARKETING_DIR, "..");

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const SITE = "https://refocus.co.in";

function resolveLocale() {
  const raw = (getArg("--locale") || process.env.POST_LOCALE || "en")
    .trim()
    .toLowerCase();
  return LOCALE_IDS.includes(raw) ? raw : "en";
}

function blogDirForConfig(config) {
  return join(MARKETING_DIR, "src/content", config.contentSubdir);
}

function pillarUrl(category, config) {
  const path =
    category.pillar?.path || config.defaultPillar.path;
  return `${SITE}${path.startsWith("/") ? path : `/${path}`}`;
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
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/['"']/g, "")
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

function resolveCategoryId(config) {
  const fromArg = getArg("--category") || process.env.POST_CATEGORY || "";
  if (fromArg) {
    const cat = config.getCategory(fromArg);
    if (!cat) {
      console.error(
        `Unknown category "${fromArg}". Use one of: ${CATEGORY_IDS.join(", ")}`,
      );
      process.exit(1);
    }
    return cat.id;
  }
  return config.pickCategory();
}

const TOPIC_KEYWORDS = [
  "utbk", "snbt", "tryout", "seleksi", "pnle", "let", "upcat", "board exam",
  "thpt", "bpo", "body doubling", "body-doubling", "coworking", "focusmate",
  "adhd", "freelancer", "wfh", "isolasi", "kesepian", "kalungkutan", "cô đơn",
  "study with me", "upsc", "prelims", "mains", "neet", "jee",
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
  const forced = getArg("--topic") || process.env.POST_TOPIC?.trim() || "";
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

async function uniqueSlug(blogDir, slug, existingSlugs = []) {
  const base = slug || "post";
  const words = base.split("-").filter((w) => w.length > 3);
  const tooSimilar = existingSlugs.some((s) => {
    const sw = s.split("-").filter((w) => w.length > 3);
    return words.filter((w) => sw.includes(w)).length >= 2;
  });
  if (tooSimilar) {
    throw new Error(
      `Slug "${base}" is too similar to an existing post — use a clearly different angle.`,
    );
  }
  if (!existsSync(join(blogDir, `${base}.md`))) return base;
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const angled = `${base}-${stamp}`;
  if (!existsSync(join(blogDir, `${angled}.md`))) {
    console.warn(
      `Slug "${base}" already exists — using dated slug "${angled}" instead of -2.`,
    );
    return angled;
  }
  throw new Error(
    `Slug collision for "${base}" (and dated fallback). Pick a clearly different title/slug.`,
  );
}

function linkBank(categoryId, config) {
  return config.linkBank[categoryId] || config.linkBank.productivity;
}

function buildSystemPrompt(category, topic, config) {
  const freeCommercial = isFreeCommercialTopic(topic);
  const commercialRule = freeCommercial
    ? `5b. COMMERCIAL HUB LINK (required): include EXACTLY ONE Markdown link to one of — ${SITE}${config.pricingPath}; ${SITE}${config.freePath}; ${SITE}${config.altPath}. Place naturally mid-article.`
    : `5b. COMMERCIAL HUB LINK (optional): if you mention free tools or pricing, you MAY add one link to ${SITE}${config.pricingPath}. Otherwise omit.`;

  const bank = linkBank(category.id, config);

  return `You write SEO-friendly, genuinely useful long-form articles. Readers should leave with tactics they can use today — even if they never hear of any product.

${config.langRule}

Niche for this article: ${category.label}
Audience: ${category.audience}
Voice: ${category.voice}

Hard requirements:
1. TITLE: specific and searchable. No brand names in the title unless comparing publicly known tools (Focusmate, Discord, Zoom).
2. Do NOT pitch or center any product as the whole article. Soft product mentions allowed only as instructed below.
3. OUTBOUND LINKS: include 3–5 Markdown links to real external resources. Prefer:
${bank.map((l) => `   - ${l}`).join("\n")}
4. OPTIONAL soft tool mention: You MAY mention Refocus (${SITE}) at most ONCE, mid-article, as a quiet example of virtual body doubling — never in title or intro.
5. INTERNAL LINK (required): include EXACTLY ONE Markdown link to ${pillarUrl(category, config)}, placed naturally high in the article as further reading.
${commercialRule}
6. Must include: ${category.mustInclude}
7. Avoid: ${category.avoid}
8. Structure: Markdown with 3–5 "##" headings, ~900–1200 words. No emojis. No "In conclusion".
9. Be specific: name tools, routines. Vague motivational writing is a failure.`;
}

function buildUserPrompt(category, topic, existingTitles, existingUrls, config) {
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
  const landing = `\n\nRequired internal link — link to this guide exactly once, high in the article:\n- ${pillarUrl(category, config)}\nOther related internal pages:\n${config.landingPages.map((p) => `- ${SITE}${p.split(" — ")[0]}`).join("\n")}`;

  return `${config.langUser} Write a blog post in the "${category.label}" niche about: ${topic}.${avoidTitles}${landing}${internal}

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
  config,
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
        { role: "system", content: buildSystemPrompt(category, topic, config) },
        {
          role: "user",
          content: buildUserPrompt(
            category,
            topic,
            existingTitles,
            existingUrls,
            config,
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

function ensureOutboundLinks(body, categoryId, config) {
  if (countOutboundLinks(body) >= 3) return body;
  const bank = linkBank(categoryId, config);
  const picks = bank.slice(0, 4);
  const lines = picks.map((entry) => {
    const url = entry.split(" — ")[0].trim();
    const label = entry.split(" — ")[1]?.trim() || url;
    return `- [${label}](${url})`;
  });
  return `${body.trim()}\n\n## Further reading\n\n${lines.join("\n")}\n`;
}

function ensurePillarLink(body, category, config) {
  const path = category.pillar?.path || config.defaultPillar.path;
  const label = category.pillar?.label || config.defaultPillar.label;
  const url = `${SITE}${path.startsWith("/") ? path : `/${path}`}`;
  const linksPillar = new RegExp(
    `\\]\\((?:${SITE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})?${path.replace(
      /[.*+?^${}()|[\]\\]/g,
      "\\$&",
    )}(?:[)#/?]|$)`,
    "i",
  ).test(body);
  if (linksPillar) return body;

  const sentence = config.pillarInject
    .replace("{label}", label)
    .replace("{url}", url);
  const paras = body.split(/\n{2,}/);
  const idx = paras.findIndex((p) => p.trim() && !p.trim().startsWith("#"));
  if (idx === -1) return `${sentence}\n\n${body}`;
  paras.splice(idx + 1, 0, sentence);
  return paras.join("\n\n");
}

function toFrontmatter({ title, description, tags, category, config }) {
  const pubDate = new Date().toISOString();
  const q = (s) => JSON.stringify(String(s));
  const tagList = Array.isArray(tags) ? tags : [];
  if (!tagList.map((t) => String(t).toLowerCase()).includes(category.id)) {
    tagList.unshift(category.id);
  }
  const localeLine = config.localeField
    ? `\nlocale: ${q(config.localeField)}`
    : "";
  return `---
title: ${q(title)}
description: ${q(description)}
pubDate: ${q(pubDate)}
category: ${q(category.id)}
tags: [${tagList.map((t) => q(t)).join(", ")}]
author: ${q(config.author)}${localeLine}
draft: false
---
`;
}

async function main() {
  await loadEnvFile(join(REPO_ROOT, ".env"));
  await loadEnvFile(join(MARKETING_DIR, ".env"));

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.error("Missing OPENAI_API_KEY.");
    process.exit(1);
  }

  const localeKey = resolveLocale();
  const config = resolveLocaleConfig(localeKey);
  const blogDir = blogDirForConfig(config);
  const urlPrefix = config.urlPrefix;
  const categoryId = resolveCategoryId(config);
  const category = config.categories[categoryId];
  const { titles: existingTitles, urls: existingUrls, slugs: existingSlugs, dedupTexts } =
    await getExistingMeta(blogDir, urlPrefix);
  const topic = pickTopic(category, dedupTexts);

  console.log(`Locale: ${config.id}`);
  console.log(`Category: ${category.id} (${category.label})`);
  console.log(`Topic: ${topic}`);
  console.log(`Model: ${MODEL}`);

  const result = await callOpenAI(
    apiKey,
    category,
    topic,
    existingTitles,
    existingUrls,
    config,
  );

  const title = sanitizeTitle(result.title || "");
  if (!title) throw new Error("Model did not return a usable title.");
  const description = String(result.description || "").slice(0, 160);
  let body = String(result.body_markdown || "").trim();
  if (body.length < 200) throw new Error("Model returned an empty/short body.");
  body = ensureOutboundLinks(body, category.id, config);
  body = ensurePillarLink(body, category, config);

  const outbound = countOutboundLinks(body);
  console.log(`Outbound links (non-Refocus): ${outbound}`);
  console.log(`Pillar link: ${pillarUrl(category, config)}`);

  const baseSlug = slugify(result.slug || title);
  const slug = await uniqueSlug(blogDir, baseSlug, existingSlugs);

  const contents = `${toFrontmatter({
    title,
    description,
    tags: result.tags,
    category,
    config,
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
