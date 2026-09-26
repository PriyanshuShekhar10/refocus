#!/usr/bin/env node
/**
 * Generate a niche blog post for the Refocus marketing site (OpenAI).
 *
 * Flow: propose topic → clash-check / pivot → write article (English:
 * outline then section-by-section) → optional illustration. Never
 * hard-fail solely because a theme was covered.
 *
 * Usage:
 *   node scripts/generate-post.mjs
 *   node scripts/generate-post.mjs --category exams --locale id
 *   node scripts/generate-post.mjs --category exams --locale fil
 *   node scripts/generate-post.mjs --category remote --locale vi
 *   node scripts/generate-post.mjs --skip-image
 *   SKIP_IMAGE=1 node scripts/generate-post.mjs --category med-school
 *   STRICT_QUALITY=1 node scripts/generate-post.mjs --category med-school --skip-image
 *
 * Locales: en | id | fil | vi | de
 * CI sets SKIP_IMAGE=1 and STRICT_QUALITY=1 (fail hard; no soft-accept).
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
const IMAGE_ATTEMPTS = 3;
const MIN_WORDS_EN = 900;
const MIN_WORDS_OTHER = 900;
const MIN_HEADINGS_EN = 3;
const MIN_HEADINGS_OTHER = 2;
const TARGET_WORDS_EN = "900–1200";
const EN_OUTLINE_WORD_MIN = 900;
const EN_OUTLINE_WORD_MAX = 1200;
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

function hasFlag(flag) {
  return process.argv.slice(2).includes(flag);
}

/** Fail hard (no soft-accept) when --strict, STRICT_QUALITY=1, or GITHUB_ACTIONS. */
function shouldStrictQuality() {
  if (hasFlag("--strict")) return true;
  const v = (process.env.STRICT_QUALITY || "").trim().toLowerCase();
  if (v === "1" || v === "true" || v === "yes") return true;
  return process.env.GITHUB_ACTIONS === "true";
}

/** Skip Images API when --skip-image or SKIP_IMAGE=1/true/yes (CI default). */
function shouldSkipImage() {
  if (hasFlag("--skip-image")) return true;
  const env = String(process.env.SKIP_IMAGE || "")
    .trim()
    .toLowerCase();
  return env === "1" || env === "true" || env === "yes";
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

function normalizeOutlineSections(rawSections) {
  const sections = Array.isArray(rawSections) ? rawSections : [];
  const normalized = [];
  for (const s of sections) {
    if (!s || typeof s !== "object") continue;
    const heading =
      s.heading == null || s.heading === ""
        ? null
        : String(s.heading).replace(/^#+\s*/, "").trim();
    const purpose = String(s.purpose || "").trim();
    let target = Number(s.target_words);
    if (!Number.isFinite(target) || target < 80) target = heading ? 220 : 120;
    normalized.push({ heading, purpose, target_words: Math.round(target) });
  }
  // Ensure intro (heading null) first, then 3–4 H2s
  let intro = normalized.find((s) => !s.heading);
  const headed = normalized.filter((s) => s.heading);
  if (!intro) {
    intro = {
      heading: null,
      purpose: "Open with a concrete scene (time, place, what they are avoiding).",
      target_words: 120,
    };
  }
  while (headed.length < 3) {
    headed.push({
      heading: `Practical step ${headed.length + 1}`,
      purpose: "A named tactic with duration, script, or if-then rule.",
      target_words: 220,
    });
  }
  const capped = headed.slice(0, 4);
  const out = [intro, ...capped];
  let sum = out.reduce((a, s) => a + s.target_words, 0);
  if (sum < EN_OUTLINE_WORD_MIN) {
    const bump = Math.ceil((EN_OUTLINE_WORD_MIN - sum) / capped.length);
    for (const s of capped) s.target_words += bump;
    sum = out.reduce((a, s) => a + s.target_words, 0);
  }
  if (sum > EN_OUTLINE_WORD_MAX) {
    const scale = EN_OUTLINE_WORD_MAX / sum;
    for (const s of out) {
      s.target_words = Math.max(80, Math.round(s.target_words * scale));
    }
  }
  return out;
}

async function outlineEnglishPost(
  apiKey,
  model,
  category,
  topic,
  existingTitles,
  config,
  angle,
  repeating,
  priorIssues = [],
) {
  const avoidTitles =
    existingTitles.length > 0
      ? `\nAlready published titles — do not echo:\n${existingTitles
          .slice(-80)
          .map((t) => `- ${t}`)
          .join("\n")}`
      : "";
  const fix =
    priorIssues.length > 0
      ? `\nPrior draft failed: ${priorIssues.join("; ")}. Fix structure/targets accordingly.`
      : "";
  const reuse = repeating
    ? `Theme reuse — new angle required: ${angle}.`
    : `Concrete scenario: ${angle}.`;

  const plan = await chatJson(
    apiKey,
    `You outline long-form English blog posts as JSON only. No article body.
Niche: ${category.label}. Audience: ${category.audience}.
Voice: ${category.voice}. Must include later: ${category.mustInclude}. Avoid: ${category.avoid}.
Return:
{
  "title": "specific searchable under 70 chars, no brand",
  "slug": "kebab-case",
  "description": "meta under 155 chars",
  "tags": ["2-5","lowercase"],
  "sections": [
    {"heading": null, "purpose": "opening scene brief", "target_words": 120},
    {"heading": "H2 title", "purpose": "...", "target_words": 220},
    {"heading": "H2 title", "purpose": "...", "target_words": 220},
    {"heading": "H2 title", "purpose": "...", "target_words": 200}
  ]
}
Rules: first section heading MUST be null (intro). Then 3 or 4 H2 sections.
Sum of target_words must be between ${EN_OUTLINE_WORD_MIN} and ${EN_OUTLINE_WORD_MAX}.
Every H2 purpose must add new tactics/scenes — no restating the intro.`,
    `${reuse}${avoidTitles}${fix}

Topic: ${topic}
Working constraints from system quality bar: concrete opening scene; ≥2 named tactics; one failure mode + recovery.
Internal pillar will be linked later: ${pillarUrl(category, config)}.`,
    0.7,
    model,
  );

  return {
    title: sanitizeTitle(plan.title || ""),
    slug: String(plan.slug || "").trim(),
    description: String(plan.description || "").slice(0, 160),
    tags: Array.isArray(plan.tags) ? plan.tags : [],
    sections: normalizeOutlineSections(plan.sections),
  };
}

async function writeEnglishSection(
  apiKey,
  model,
  category,
  topic,
  config,
  angle,
  section,
  priorSummaries,
  title,
) {
  const isIntro = !section.heading;
  const prior =
    priorSummaries.length > 0
      ? `Already written (do not repeat):\n${priorSummaries
          .map((s, i) => `${i + 1}. ${s}`)
          .join("\n")}`
      : "Nothing written yet.";
  const system = `You write one Markdown section of a Refocus-adjacent productivity/study article.
${config.langRule}
Niche: ${category.label}. Voice: ${category.voice}.
Return JSON only: {"markdown":"...","summary":"1-2 sentences of what this section covered"}.
Rules:
- No H1. ${isIntro ? "No ## headings in this chunk — opening paragraphs only." : `Start with exactly "## ${section.heading}" then the section body.`}
- Write at least ${section.target_words} words.
- Concrete and specific; no filler ("In today's fast-paced world", "It's important to note", "In conclusion", "Without further ado" banned).
- Do not add a "Further reading" section or invent Refocus marketing copy.
- Soft product mention at most once across the whole article — prefer none in this chunk unless purpose requires it.`;

  const user = `Article title: ${title}
Topic: ${topic}
Angle/scene: ${angle}
Section purpose: ${section.purpose || "(develop the angle)"}
Target words: ≥${section.target_words}
${prior}

Write this section only.`;

  const result = await chatJson(apiKey, system, user, 0.75, model);
  let markdown = String(result.markdown || "").trim();
  if (!isIntro && section.heading && !/^##\s+/m.test(markdown)) {
    markdown = `## ${section.heading}\n\n${markdown}`;
  }
  if (!isIntro && section.heading) {
    // Normalize first heading to the planned title
    markdown = markdown.replace(/^##\s+.+$/m, `## ${section.heading}`);
  }
  const summary = String(result.summary || section.purpose || section.heading || "section").trim();
  return { markdown, summary, words: wordCount(markdown) };
}

async function draftEnglishSectioned(
  apiKey,
  model,
  category,
  topic,
  existingTitles,
  config,
  angle,
  repeating,
  priorIssues = [],
) {
  console.log("English draft: outlining sections…");
  const outline = await outlineEnglishPost(
    apiKey,
    model,
    category,
    topic,
    existingTitles,
    config,
    angle,
    repeating,
    priorIssues,
  );
  const targetSum = outline.sections.reduce((a, s) => a + s.target_words, 0);
  console.log(
    `Outline: ${outline.sections.length} sections, target ~${targetSum} words`,
  );
  for (const s of outline.sections) {
    console.log(
      `  - ${s.heading ? `## ${s.heading}` : "(intro)"} → ${s.target_words} words`,
    );
  }

  const chunks = [];
  const summaries = [];
  for (let i = 0; i < outline.sections.length; i++) {
    const section = outline.sections[i];
    console.log(
      `Writing section ${i + 1}/${outline.sections.length}: ${section.heading || "intro"}…`,
    );
    let { markdown, summary, words } = await writeEnglishSection(
      apiKey,
      model,
      category,
      topic,
      config,
      angle,
      section,
      summaries,
      outline.title,
    );
    // If a section is thin, one rewrite with a higher floor
    if (words < Math.floor(section.target_words * 0.75)) {
      console.warn(
        `Section thin (${words} < ${section.target_words}); rewriting…`,
      );
      const retry = await writeEnglishSection(
        apiKey,
        model,
        category,
        topic,
        config,
        angle,
        {
          ...section,
          purpose: `${section.purpose} Expand with a concrete example and if-then rule. Prior draft was only ${words} words.`,
          target_words: section.target_words + 40,
        },
        summaries,
        outline.title,
      );
      markdown = retry.markdown;
      summary = retry.summary;
      words = retry.words;
    }
    console.log(`  → ${words} words`);
    chunks.push(markdown);
    summaries.push(
      `${section.heading || "Intro"}: ${summary}`.slice(0, 220),
    );
  }

  const body = chunks.join("\n\n").trim();
  return {
    title: outline.title,
    slug: outline.slug,
    description: outline.description,
    tags: outline.tags,
    body_markdown: body,
  };
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

/** Outbound https links that appear outside an injected "## Further reading" section. */
function countBodyOutboundLinks(body) {
  const stripped = String(body || "")
    .replace(/^##\s+Further reading\b[\s\S]*$/im, "")
    .trim();
  return countOutboundLinks(stripped);
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
  const minHeadings =
    config.id === "en" ? MIN_HEADINGS_EN : MIN_HEADINGS_OTHER;
  const headings = (body.match(/^##\s+/gm) || []).length;
  const outbound = countBodyOutboundLinks(body);

  if (!title) issues.push("missing title");
  if (body.length < 200) issues.push("body too short");
  if (words < minWords) issues.push(`only ${words} words (need ≥${minWords})`);
  if (headings < minHeadings)
    issues.push(`only ${headings} ## headings (need ≥${minHeadings})`);
  if (outbound < 3)
    issues.push(
      `only ${outbound} in-body outbound links (need ≥3 outside Further reading)`,
    );
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

function fallbackIllustrationPrompt(title, body) {
  const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
  const opening = body
    .replace(/^#.+\n+/gm, "")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, "")
    .trim()
    .slice(0, 280)
    .replace(/\s+/g, " ");
  const place = headings[0] || "a quiet study desk at home";
  return `A quiet physical scene for "${title}": someone at ${place}, laptop or notebook on the table, soft daylight, calm empty chair nearby suggesting a study partner, no faces in close-up, no screens with readable UI. Opening mood: ${opening || "focused solo work."}`;
}

async function generateImageBytes(apiKey, prompt) {
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
    throw new Error(`image API ${imgRes.status}: ${text.slice(0, 240)}`);
  }
  const imgData = await imgRes.json();
  const b64 = imgData.data?.[0]?.b64_json;
  const url = imgData.data?.[0]?.url;
  if (b64) return Buffer.from(b64, "base64");
  if (url) {
    const fetched = await fetch(url);
    if (!fetched.ok) {
      throw new Error(`failed to download image URL (${fetched.status})`);
    }
    return Buffer.from(await fetched.arrayBuffer());
  }
  throw new Error("empty image response");
}

/**
 * Every post must ship with one illustration. Fails closed (throws) if
 * generation cannot produce bytes after retries.
 */
async function addRequiredIllustration(apiKey, title, body, slug) {
  const headings = [...body.matchAll(/^##\s+(.+)$/gm)].map((m) => m[1].trim());
  let prompt = "";
  let alt = title;
  let afterHeading = headings[0] || "";

  try {
    const plan = await chatJson(
      apiKey,
      `You plan ONE minimal editorial illustration for a blog post. Always provide a scene — never skip.
Return JSON: {"after_heading":"exact ## text or empty","alt":"short alt","prompt":"concrete physical scene description"}.
Require a concrete physical scene (desk, room, cafe, exam desk, timer on table, quiet library). Never invent logos, UI mockups, brand faces, or watermarks.`,
      `Title: ${title}\nHeadings:\n${headings.map((h) => `- ${h}`).join("\n")}\n\nOpening:\n${body.slice(0, 900)}\n\nAlways return a usable prompt.`,
      0.4,
    );
    prompt = String(plan.prompt || "").trim();
    alt = String(plan.alt || title).trim().slice(0, 120);
    afterHeading = String(plan.after_heading || afterHeading).trim();
  } catch (err) {
    console.warn(`Illustration planner failed: ${err.message || err} — using fallback prompt.`);
  }

  if (promptLooksWeak(prompt)) {
    console.warn("Illustration: weak planner prompt — using fallback scene.");
    prompt = fallbackIllustrationPrompt(title, body);
  }

  let lastErr = null;
  for (let attempt = 1; attempt <= IMAGE_ATTEMPTS; attempt++) {
    try {
      const bytes = await generateImageBytes(apiKey, prompt);
      const outDir = join(MARKETING_DIR, "public", "blog", slug);
      await mkdir(outDir, { recursive: true });
      const filePath = join(outDir, "01.png");
      await writeFile(filePath, bytes);
      const publicSrc = `/blog/${slug}/01.png`;
      console.log(`Illustration: wrote ${filePath} (attempt ${attempt})`);
      return injectImageMarkdown(body, afterHeading, alt, publicSrc);
    } catch (err) {
      lastErr = err;
      console.warn(
        `Illustration attempt ${attempt}/${IMAGE_ATTEMPTS} failed: ${err.message || err}`,
      );
      if (attempt < IMAGE_ATTEMPTS) {
        prompt = fallbackIllustrationPrompt(title, body);
      }
    }
  }

  throw new Error(
    `Required illustration failed after ${IMAGE_ATTEMPTS} attempts: ${lastErr?.message || lastErr}`,
  );
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

    if (config.id === "en") {
      result = await draftEnglishSectioned(
        apiKey,
        model,
        category,
        topic,
        existingTitles,
        config,
        angleForAttempt,
        repeating || attempt > 1,
        lastIssues,
      );
    } else {
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
    }

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
      // Never soft-accept in CI / STRICT_QUALITY; English always hard-fails.
      if (
        shouldStrictQuality() ||
        config.id === "en" ||
        !title ||
        body.length < 200
      ) {
        throw new Error(
          `Draft failed quality gate after ${DRAFT_ATTEMPTS} attempts: ${issues.join("; ")}`,
        );
      }
      console.warn("Accepting last non-English draft despite quality issues.");
    }
  }

  const description = String(result.description || "").slice(0, 160);

  const outbound = countBodyOutboundLinks(body);
  console.log(`Outbound links (non-Refocus, in-body): ${outbound}`);
  console.log(`Pillar link: ${pillarUrl(category, config)}`);

  let baseSlug = slugify(result.slug || proposal.slug_hint || title);
  if (slugTooClose(baseSlug, existingSlugs)) {
    const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    baseSlug = `${baseSlug}-${stamp}`;
    console.warn(`Slug overlapped existing tokens — using ${baseSlug}`);
  }
  const slug = await uniqueSlug(blogDir, baseSlug);

  if (shouldSkipImage()) {
    console.log("Illustration: skipped (--skip-image / SKIP_IMAGE)");
  } else {
    body = await addRequiredIllustration(apiKey, title, body, slug);
  }

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
