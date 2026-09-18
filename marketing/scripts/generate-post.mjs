#!/usr/bin/env node
/**
 * Generate a niche blog post for the Refocus marketing site (OpenAI).
 *
 * Flow: propose topic → clash-check / pivot → write article → optional
 * single illustration. Never hard-fail solely because a theme was covered.
 *
 * Usage:
 *   node scripts/generate-post.mjs
 *   node scripts/generate-post.mjs --category exams --locale id
 *   node scripts/generate-post.mjs --category exams --locale fil
 *   node scripts/generate-post.mjs --category remote --locale vi
 *
 * Locales: en | id | fil | vi
 */

import { mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  CATEGORY_IDS,
  isFreeCommercialTopic,
} from "./blog-categories.mjs";
import {
  LOCALE_IDS,
  resolveLocaleConfig,
} from "./locale-config.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MARKETING_DIR = resolve(__dirname, "..");
const REPO_ROOT = resolve(MARKETING_DIR, "..");

const MODEL_DEFAULT = process.env.OPENAI_MODEL || "gpt-4o-mini";
const MODEL_EN =
  process.env.OPENAI_MODEL_EN || process.env.OPENAI_MODEL || "gpt-4o";
const IMAGE_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";
const SITE = "https://refocus.co.in";
const TOPIC_ATTEMPTS = 3;
const DRAFT_ATTEMPTS = 3;
const MIN_WORDS_EN = 600;
const MIN_WORDS_OTHER = 900;
const MIN_HEADINGS = 2;
const TARGET_WORDS_EN = "800–1200";
const STYLE_PREFIX =
  "Calm flat editorial illustration, soft neutral palette, no text, no logos, no watermarks, no photoreal close-up faces. ";

function resolveModel(localeKey) {
  return localeKey === "en" ? MODEL_EN : MODEL_DEFAULT;
}

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
  const path = category.pillar?.path || config.defaultPillar.path;
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
  "utbk",
  "snbt",
  "tryout",
  "seleksi",
  "pnle",
  "let",
  "upcat",
  "board exam",
  "thpt",
  "bpo",
  "body doubling",
  "body-doubling",
  "coworking",
  "focusmate",
  "adhd",
  "freelancer",
  "wfh",
  "isolasi",
  "kesepian",
  "kalungkutan",
  "cô đơn",
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

function significantWords(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3);
}

function titleTooClose(candidate, existingTitles) {
  const a = new Set(significantWords(candidate));
  if (a.size === 0) return false;
  return existingTitles.some((title) => {
    const b = new Set(significantWords(title));
    if (b.size === 0) return false;
    let inter = 0;
    for (const w of a) if (b.has(w)) inter += 1;
    const union = a.size + b.size - inter;
    return union > 0 && inter / union >= 0.5;
  });
}

function slugTooClose(candidate, existingSlugs) {
  const words = String(candidate || "")
    .split("-")
    .filter((w) => w.length > 3);
  if (words.length === 0) return false;
  return existingSlugs.some((s) => {
    const sw = s.split("-").filter((w) => w.length > 3);
    return words.filter((w) => sw.includes(w)).length >= 2;
  });
}

function proposalClashes(proposal, existingTitles, existingSlugs, dedupTexts) {
  const blob = `${proposal.topic} ${proposal.working_title} ${proposal.slug_hint}`;
  if (titleTooClose(proposal.working_title, existingTitles)) {
    return "title too close to an existing post";
  }
  if (slugTooClose(slugify(proposal.slug_hint || proposal.working_title), existingSlugs)) {
    return "slug too similar to an existing post";
  }
  if (topicClashes(blob, dedupTexts)) {
    return "topic keywords overlap an existing post";
  }
  return "";
}

const VARIATION_ANGLES = [
  "the first 45 minutes after waking, before picking up the phone",
  "restarting after a failed or abandoned session earlier the same day",
  "a shared room with family or a roommate just out of sight",
  "only one 50-minute block available today — nothing else will be protected",
  "a late session when energy is already low and willpower is gone",
  "coming back after a week of avoidance without a dramatic reset",
  "no proper desk: bed, floor, kitchen table, or a noisy cafe",
  "the gap between classes, client calls, or shifts",
  "a skeptic who already knows the usual advice and needs a tighter protocol",
  "a silent partner who will not chat — they only sit and work",
];

function pickVariation() {
  return VARIATION_ANGLES[Math.floor(Math.random() * VARIATION_ANGLES.length)];
}

function unusedPoolTopics(category, existingTexts) {
  return category.topics.filter((t) => !topicClashes(t, existingTexts));
}

async function chatJson(apiKey, system, user, temperature = 0.85, model = MODEL_DEFAULT) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
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

async function proposeTopic(
  apiKey,
  category,
  config,
  existingTitles,
  rejected,
  preferredPool,
) {
  const avoid =
    existingTitles.length > 0
      ? existingTitles
          .slice(-80)
          .map((t) => `- ${t}`)
          .join("\n")
      : "(none yet)";
  const rejectedBlock =
    rejected.length > 0
      ? `\nRejected proposals — do NOT reuse these themes or synonyms:\n${rejected
          .map((r) => `- ${r.topic} / ${r.working_title} (${r.reason})`)
          .join("\n")}`
      : "";
  const poolHint =
    preferredPool.length > 0
      ? `\nPrefer inventing a concrete angle near one of these unused seeds (or invent something entirely new that still fits the niche):\n${preferredPool
          .slice(0, 8)
          .map((t) => `- ${t}`)
          .join("\n")}`
      : `\nInvent a fresh concrete angle for this niche. Do not synonym-spin common covered themes.`;

  return chatJson(
    apiKey,
    `You propose DISTINCT blog angles for a ${config.id} site. Output JSON only.
Niche: ${category.label}. Audience: ${category.audience}.
Must include later: ${category.mustInclude}. Avoid: ${category.avoid}.
Return: {"topic":"...","working_title":"...","slug_hint":"kebab-case","angle":"one concrete scene/constraint"}`,
    `${config.langUser} Propose ONE unused blog angle for "${category.label}".
Already published titles:
${avoid}${rejectedBlock}${poolHint}

Requirements:
- working_title names a situation or constraint, not a generic theme
- angle is a specific time/place/constraint (not a synonym of rejected ones)
- slug_hint is kebab-case and must not echo existing slugs`,
    0.95,
  );
}

async function resolveTopicProposal(
  apiKey,
  category,
  config,
  existingTitles,
  existingSlugs,
  dedupTexts,
) {
  const forced = getArg("--topic") || process.env.POST_TOPIC?.trim() || "";
  const preferredPool = unusedPoolTopics(category, dedupTexts);
  const rejected = [];

  if (forced) {
    const proposal = {
      topic: forced,
      working_title: forced,
      slug_hint: slugify(forced),
      angle: pickVariation(),
    };
    const reason = proposalClashes(
      proposal,
      existingTitles,
      existingSlugs,
      dedupTexts,
    );
    if (reason) {
      console.warn(
        `Forced topic clashes (${reason}); pivoting to a new proposal…`,
      );
      rejected.push({ ...proposal, reason });
    } else {
      return { ...proposal, repeating: false };
    }
  }

  for (let attempt = 1; attempt <= TOPIC_ATTEMPTS; attempt++) {
    if (preferredPool.length > 0 && attempt === 1 && !forced) {
      const seed =
        preferredPool[Math.floor(Math.random() * preferredPool.length)];
      const proposal = {
        topic: seed,
        working_title: seed,
        slug_hint: slugify(seed),
        angle: pickVariation(),
      };
      const reason = proposalClashes(
        proposal,
        existingTitles,
        existingSlugs,
        dedupTexts,
      );
      if (!reason) {
        console.log(`Topic seed from pool (unused): ${seed}`);
        return { ...proposal, repeating: false };
      }
      rejected.push({ ...proposal, reason });
    }

    const raw = await proposeTopic(
      apiKey,
      category,
      config,
      existingTitles,
      rejected,
      preferredPool,
    );
    const proposal = {
      topic: String(raw.topic || "").trim(),
      working_title: String(raw.working_title || raw.topic || "").trim(),
      slug_hint: slugify(raw.slug_hint || raw.working_title || raw.topic || ""),
      angle: String(raw.angle || pickVariation()).trim(),
    };
    if (!proposal.topic || !proposal.working_title) {
      rejected.push({
        topic: proposal.topic || "(empty)",
        working_title: proposal.working_title || "(empty)",
        reason: "empty proposal",
      });
      continue;
    }
    const reason = proposalClashes(
      proposal,
      existingTitles,
      existingSlugs,
      dedupTexts,
    );
    if (reason) {
      console.warn(`Topic attempt ${attempt} rejected: ${reason}`);
      rejected.push({ ...proposal, reason });
      continue;
    }
    return { ...proposal, repeating: false };
  }

  // Last resort: accept a pivoted LLM proposal even if keywords overlap,
  // but keep a strong distinct angle so the full article can diverge.
  const fallback = await proposeTopic(
    apiKey,
    category,
    config,
    existingTitles,
    rejected,
    preferredPool,
  );
  const proposal = {
    topic: String(fallback.topic || category.topics[0] || category.label).trim(),
    working_title: String(
      fallback.working_title || fallback.topic || category.label,
    ).trim(),
    slug_hint: slugify(
      fallback.slug_hint || fallback.working_title || fallback.topic || "post",
    ),
    angle: String(fallback.angle || pickVariation()).trim(),
    repeating: true,
  };
  console.warn(
    "Topic pool exhausted — proceeding with pivoted angle (repeating theme).",
  );
  return proposal;
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

async function uniqueSlug(blogDir, slug) {
  const base = slug || "post";
  if (!existsSync(join(blogDir, `${base}.md`))) return base;
  const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const angled = `${base}-${stamp}`;
  if (!existsSync(join(blogDir, `${angled}.md`))) {
    console.warn(`Slug "${base}" already exists — using dated slug "${angled}".`);
    return angled;
  }
  const hour = new Date().toISOString().slice(11, 13);
  const timed = `${base}-${stamp}-${hour}`;
  if (!existsSync(join(blogDir, `${timed}.md`))) return timed;
  return `${timed}-${Math.floor(Math.random() * 1000)}`;
}

function linkBank(categoryId, config) {
  return config.linkBank[categoryId] || config.linkBank.productivity;
}

function buildSystemPrompt(category, topic, config, angle, repeating) {
  const freeCommercial = isFreeCommercialTopic(topic);
  const commercialRule = freeCommercial
    ? `5b. COMMERCIAL HUB LINK (required): include EXACTLY ONE Markdown link to one of — ${SITE}${config.pricingPath}; ${SITE}${config.freePath}; ${SITE}${config.altPath}. Place naturally mid-article.`
    : `5b. COMMERCIAL HUB LINK (optional): if you mention free tools or pricing, you MAY add one link to ${SITE}${config.pricingPath}. Otherwise omit.`;

  const bank = linkBank(category.id, config);
  const repeatRule = repeating
    ? `10. This theme has been covered before. Write a NEW article: different opening scene, different examples, different protocol. No synonym spinning.`
    : `10. Keep the article concrete and distinct from older posts. New scene, new examples, new if-then rules.`;

  const isEn = config.id === "en";
  const wordTarget = isEn ? TARGET_WORDS_EN : "900–1200";
  const qualityBlock = isEn
    ? `Quality bar (English — failure if missed):
- Open with a concrete scene (time, place, what the person is avoiding) in the first 120 words — not a definition or pep talk.
- Include at least TWO named tactics with durations, scripts, or if-then rules a reader can run today.
- Include ONE realistic failure mode and the recovery step.
- Prefer depth over breadth: fewer ideas, fully worked. No numbered "secrets" listicles. No filler phrases like "In today's fast-paced world", "It's important to note", "In conclusion".
- Every ## section must earn its place with new information, not restate the intro.`
    : `Quality bar:
- Be specific: name tools, routines, durations. Vague motivational writing is a failure.
- Prefer concrete scenes and protocols over generic advice.`;

  return `You write genuinely useful long-form articles for humans. Rankings follow from specificity — not from repeating the same post in new words. Readers should leave with tactics they can run today, even if they never hear of any product.

${config.langRule}

Niche for this article: ${category.label}
Audience: ${category.audience}
Voice: ${category.voice}
Required scene / constraint for THIS draft: ${angle}

Hard requirements:
1. TITLE: specific and searchable. Names a situation or constraint, not a generic theme. No brand names in the title unless comparing publicly known tools (Focusmate, Discord, Zoom).
2. Do NOT pitch or center any product as the whole article. Soft product mentions allowed only as instructed below.
3. OUTBOUND LINKS: include 3–5 Markdown links to real external resources. Prefer:
${bank.map((l) => `   - ${l}`).join("\n")}
4. OPTIONAL soft tool mention: You MAY mention Refocus (${SITE}) at most ONCE, mid-article, as a quiet example of virtual body doubling — never in title or intro.
5. INTERNAL LINK (required): include EXACTLY ONE Markdown link to ${pillarUrl(category, config)}, placed naturally high in the article as further reading.
${commercialRule}
6. Must include: ${category.mustInclude}
7. Avoid: ${category.avoid}
8. Structure: Markdown with 2–4 "##" headings, ${wordTarget} words. No emojis. No "In conclusion".
9. ${qualityBlock}
${repeatRule}`;
}

function buildUserPrompt(
  category,
  topic,
  existingTitles,
  existingUrls,
  config,
  angle,
  repeating,
) {
  const avoidTitles =
    existingTitles.length > 0
      ? `\n\nAlready published titles — your title, outline, and examples must not echo these:\n${existingTitles
          .slice(-80)
          .map((t) => `- ${t}`)
          .join("\n")}`
      : "";
  const internal =
    existingUrls.length > 0
      ? `\n\nIf natural, you may add 0–1 internal link to a related older post:\n${existingUrls
          .slice(-8)
          .map((u) => `- ${u}`)
          .join("\n")}`
      : "";
  const landing = `\n\nRequired internal link — link to this guide exactly once, high in the article:\n- ${pillarUrl(category, config)}\nOther related internal pages:\n${config.landingPages.map((p) => `- ${SITE}${p.split(" — ")[0]}`).join("\n")}`;
  const reuse = repeating
    ? `\n\nThis broad topic has been covered before. Reuse the theme, not the article. New angle: ${angle}.`
    : `\n\nWrite from this concrete scenario (do not ignore it): ${angle}.`;

  return `${config.langUser} Write a blog post in the "${category.label}" niche about: ${topic}.${reuse}${avoidTitles}${landing}${internal}

Return ONLY JSON:
{
  "title": "specific, searchable, under 70 chars, no brand",
  "slug": "kebab-case-url-slug",
  "description": "meta description under 155 chars",
  "tags": ["2-5", "lowercase", "tags"],
  "body_markdown": "full Markdown body (no H1). Must include 3-5 outbound https links and meet the word target."
}`;
}

async function callOpenAI(
  apiKey,
  model,
  category,
  topic,
  existingTitles,
  existingUrls,
  config,
  angle,
  repeating,
) {
  const temperature = config.id === "en" ? 0.75 : 0.9;
  return chatJson(
    apiKey,
    buildSystemPrompt(category, topic, config, angle, repeating),
    buildUserPrompt(
      category,
      topic,
      existingTitles,
      existingUrls,
      config,
      angle,
      repeating,
    ),
    temperature,
    model,
  );
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

function wordCount(markdown) {
  return String(markdown || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .split(/\s+/)
    .filter(Boolean).length;
}

const FILLER_RE =
  /in today'?s fast[- ]paced|it'?s important to note|in conclusion|unlock your potential|game[- ]changer|in this article,? we will|without further ado/i;

function qualityIssues(title, body, config) {
  const issues = [];
  const words = wordCount(body);
  const minWords = config.id === "en" ? MIN_WORDS_EN : MIN_WORDS_OTHER;
  const headings = (body.match(/^##\s+/gm) || []).length;
  const outbound = countOutboundLinks(body);

  if (!title) issues.push("missing title");
  if (body.length < 200) issues.push("body too short");
  if (words < minWords) issues.push(`only ${words} words (need ≥${minWords})`);
  if (headings < MIN_HEADINGS)
    issues.push(`only ${headings} ## headings (need ≥${MIN_HEADINGS})`);
  if (outbound < 3) issues.push(`only ${outbound} outbound links (need ≥3)`);
  if (FILLER_RE.test(body) || FILLER_RE.test(title)) {
    issues.push("contains filler / listicle phrasing");
  }
  if (config.id === "en") {
    const opening = body.replace(/^#.+\n+/gm, "").trim().slice(0, 400);
    if (
      /^(body doubling is|productivity is|focus is|in a world where|many people struggle)/i.test(
        opening,
      )
    ) {
      issues.push("opening is generic definition/pep-talk, not a scene");
    }
  }
  return issues;
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

function promptLooksWeak(prompt) {
  const p = String(prompt || "").toLowerCase();
  if (p.length < 24) return true;
  const bad = [
    "logo",
    "watermark",
    "screenshot",
    "ui mock",
    "refocus app",
    "stock photo",
    "generic productivity",
    "abstract metaphor",
  ];
  return bad.some((b) => p.includes(b));
}

function injectImageMarkdown(body, afterHeading, alt, src) {
  const md = `![${alt}](${src})`;
  if (afterHeading) {
    const headingRe = new RegExp(
      `^(##\\s+${afterHeading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*)$`,
      "im",
    );
    if (headingRe.test(body)) {
      return body.replace(headingRe, `$1\n\n${md}`);
    }
  }
  const firstHeading = body.match(/^##\s+.+$/m);
  if (firstHeading) {
    return body.replace(firstHeading[0], `${firstHeading[0]}\n\n${md}`);
  }
  const paras = body.split(/\n{2,}/);
  if (paras.length > 0) {
    paras.splice(1, 0, md);
    return paras.join("\n\n");
  }
  return `${md}\n\n${body}`;
}

async function maybeAddIllustration(apiKey, title, body, slug) {
  try {
    const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
    const plan = await chatJson(
      apiKey,
      `You decide whether a blog post needs ONE minimal editorial illustration.
Return JSON: {"skip":boolean,"after_heading":"exact ## text or empty","alt":"short alt","prompt":"concrete scene description"}.
Skip unless there is a concrete physical scene (desk, room, cafe, exam desk, timer on table). Never invent logos, UI, or brand faces.`,
      `Title: ${title}\nHeadings:\n${headings.map((h) => `- ${h}`).join("\n")}\n\nOpening:\n${body.slice(0, 900)}\n\nPrefer skip:true when unsure. At most one image.`,
      0.4,
    );

    if (plan.skip === true || plan.skip === "true") {
      console.log("Illustration: skipped (no strong scene fit).");
      return body;
    }
    const prompt = String(plan.prompt || "").trim();
    const alt = String(plan.alt || title).trim().slice(0, 120);
    const afterHeading = String(plan.after_heading || "").trim();
    if (promptLooksWeak(prompt)) {
      console.warn("Illustration: weak/irrelevant prompt — skipping.");
      return body;
    }

    const imgRes = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: IMAGE_MODEL,
        prompt: `${STYLE_PREFIX}${prompt}`,
        size: "1024x1024",
        n: 1,
      }),
    });
    if (!imgRes.ok) {
      const text = await imgRes.text();
      console.warn(`Illustration: image API ${imgRes.status} — ${text.slice(0, 200)}`);
      return body;
    }
    const imgData = await imgRes.json();
    const b64 = imgData.data?.[0]?.b64_json;
    const url = imgData.data?.[0]?.url;
    let bytes;
    if (b64) {
      bytes = Buffer.from(b64, "base64");
    } else if (url) {
      const fetched = await fetch(url);
      if (!fetched.ok) {
        console.warn("Illustration: failed to download image URL — skipping.");
        return body;
      }
      bytes = Buffer.from(await fetched.arrayBuffer());
    } else {
      console.warn("Illustration: empty image response — skipping.");
      return body;
    }

    const outDir = join(MARKETING_DIR, "public", "blog", slug);
    await mkdir(outDir, { recursive: true });
    const filePath = join(outDir, "01.png");
    await writeFile(filePath, bytes);
    const publicSrc = `/blog/${slug}/01.png`;
    console.log(`Illustration: wrote ${filePath}`);
    return injectImageMarkdown(body, afterHeading, alt, publicSrc);
  } catch (err) {
    console.warn(`Illustration: ${err.message || err} — keeping text-only.`);
    return body;
  }
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
  const {
    titles: existingTitles,
    urls: existingUrls,
    slugs: existingSlugs,
    dedupTexts,
  } = await getExistingMeta(blogDir, urlPrefix);

  const proposal = await resolveTopicProposal(
    apiKey,
    category,
    config,
    existingTitles,
    existingSlugs,
    dedupTexts,
  );
  const topic = proposal.topic;
  const angle = proposal.angle || pickVariation();
  const repeating = Boolean(proposal.repeating);

  const model = resolveModel(localeKey);
  console.log(`Locale: ${config.id}`);
  console.log(`Category: ${category.id} (${category.label})`);
  console.log(
    `Topic: ${topic}${repeating ? " (theme reuse — new angle required)" : ""}`,
  );
  console.log(`Working title hint: ${proposal.working_title}`);
  console.log(`Angle: ${angle}`);
  console.log(`Model: ${model}`);

  let result;
  let title = "";
  let body = "";
  let lastIssues = [];
  for (let attempt = 1; attempt <= DRAFT_ATTEMPTS; attempt++) {
    const angleForAttempt =
      attempt === 1
        ? angle
        : `${angle} — prior draft failed quality: ${lastIssues.join("; ")}. Fix those issues. Pick a clearly different title if needed.`;
    result = await callOpenAI(
      apiKey,
      model,
      category,
      topic,
      existingTitles,
      existingUrls,
      config,
      angleForAttempt,
      repeating || attempt > 1,
    );
    title = sanitizeTitle(result.title || "");
    body = String(result.body_markdown || "").trim();
    body = ensureOutboundLinks(body, category.id, config);
    body = ensurePillarLink(body, category, config);

    const close = titleTooClose(title, existingTitles);
    const issues = qualityIssues(title, body, config);
    if (close) issues.push("title too close to an existing post");
    lastIssues = issues;

    if (issues.length === 0) {
      console.log(`Draft words: ${wordCount(body)} (attempt ${attempt})`);
      break;
    }

    console.warn(
      `Quality gate failed (attempt ${attempt}/${DRAFT_ATTEMPTS}): ${issues.join("; ")}`,
    );
    if (attempt === DRAFT_ATTEMPTS) {
      // English must meet the bar; other locales may soft-accept last draft if not empty.
      if (config.id === "en" || !title || body.length < 200) {
        throw new Error(
          `Draft failed quality gate after ${DRAFT_ATTEMPTS} attempts: ${issues.join("; ")}`,
        );
      }
      console.warn("Accepting last non-English draft despite quality issues.");
    }
  }

  const description = String(result.description || "").slice(0, 160);

  const outbound = countOutboundLinks(body);
  console.log(`Outbound links (non-Refocus): ${outbound}`);
  console.log(`Pillar link: ${pillarUrl(category, config)}`);

  let baseSlug = slugify(result.slug || proposal.slug_hint || title);
  if (slugTooClose(baseSlug, existingSlugs)) {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    baseSlug = `${baseSlug}-${stamp}`;
    console.warn(`Slug overlapped existing tokens — using ${baseSlug}`);
  }
  const slug = await uniqueSlug(blogDir, baseSlug);

  body = await maybeAddIllustration(apiKey, title, body, slug);

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
