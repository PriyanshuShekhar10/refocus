#!/usr/bin/env node
/**
 * Generate a blog post for the Refocus marketing site using the OpenAI API.
 *
 * Usage:
 *   node scripts/generate-post.mjs
 *   node scripts/generate-post.mjs --topic "beating procrastination as a remote worker"
 *
 * Env:
 *   OPENAI_API_KEY   (required)  — read from process.env or the repo-root .env
 *   OPENAI_MODEL     (optional)  — defaults to "gpt-4o-mini"
 *   POST_TOPIC       (optional)  — same as --topic (used by CI)
 *
 * Output:
 *   Writes a Markdown file to src/content/blog/<slug>.md and prints the path.
 *
 * The post is written to be genuinely useful. Refocus is mentioned once,
 * naturally, in the MIDDLE of the article (never the title/intro) with a soft,
 * non-salesy suggestion and a link to https://refocus.co.in.
 */

import { readFile, readdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const MARKETING_DIR = resolve(__dirname, "..");
const REPO_ROOT = resolve(MARKETING_DIR, "..");
const BLOG_DIR = join(MARKETING_DIR, "src/content/blog");

const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const SITE = "https://refocus.co.in";

/** Load a KEY=VALUE .env file into process.env if not already set. */
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

function getArgTopic() {
  const argv = process.argv.slice(2);
  const i = argv.indexOf("--topic");
  if (i !== -1 && argv[i + 1]) return argv[i + 1];
  return process.env.POST_TOPIC?.trim() || "";
}

// Pool of angles the model can draw from when no topic is supplied. Kept broad
// so scheduled runs stay varied and useful to a productivity-minded audience.
const TOPIC_POOL = [
  "the psychology of body doubling and why working near someone helps you focus",
  "how to start a deep work session when you keep procrastinating",
  "building a focus routine that survives bad days",
  "why remote workers lose momentum and how to get it back",
  "time-boxing vs. the Pomodoro technique: what actually sticks",
  "beating the blank-page problem for writers and students",
  "how to study for competitive exams without burning out",
  "the real reason open-ended to-do lists make you anxious",
  "designing a distraction-resistant workspace at home",
  "accountability without pressure: gentle ways to stay on task",
  "how ADHD brains can use structure and co-working to focus",
  "the cost of context switching and how to protect your attention",
  "why 'just focus' advice fails and what to do instead",
  "morning deep work: making the first hour count",
  "finishing side projects when motivation runs out",
];

function pickTopic(existingTitles) {
  const seed = Date.now() + Math.floor(Math.random() * 1000);
  const start = seed % TOPIC_POOL.length;
  // Prefer a topic whose words don't heavily overlap recent titles.
  for (let k = 0; k < TOPIC_POOL.length; k++) {
    const candidate = TOPIC_POOL[(start + k) % TOPIC_POOL.length];
    const key = candidate.split(" ").slice(0, 3).join(" ").toLowerCase();
    const clash = existingTitles.some((t) => t.toLowerCase().includes(key));
    if (!clash) return candidate;
  }
  return TOPIC_POOL[start];
}

async function getExistingTitles() {
  if (!existsSync(BLOG_DIR)) return [];
  const files = (await readdir(BLOG_DIR)).filter((f) => f.endsWith(".md"));
  const titles = [];
  for (const f of files) {
    const raw = await readFile(join(BLOG_DIR, f), "utf8");
    const m = raw.match(/^title:\s*(.+)$/m);
    if (m) titles.push(m[1].replace(/^["']|["']$/g, "").trim());
  }
  return titles;
}

async function uniqueSlug(slug) {
  let candidate = slug || "post";
  let n = 2;
  while (existsSync(join(BLOG_DIR, `${candidate}.md`))) {
    candidate = `${slug}-${n++}`;
  }
  return candidate;
}

const SYSTEM_PROMPT = `You are a seasoned writer for a productivity blog. You write clear, warm, genuinely useful articles for people who struggle to focus: remote workers, students, freelancers, and folks with ADHD. You avoid hype, buzzwords, and "productivity porn". You write like a thoughtful human sharing what actually works.

Refocus is a virtual co-working app (https://refocus.co.in): pick a 25/50/75-minute session, get paired with someone who's also there to focus, briefly share what you're working on, then work side-by-side with synced timers and a check-in at the end. It is built around accountability, not conversation.

Rules for the article you write:
- The TITLE must be about the topic and useful on its own. It must NOT contain the word "Refocus" or any brand name.
- The introduction must NOT mention Refocus.
- Mention Refocus exactly once, naturally, roughly in the MIDDLE of the article, as a helpful suggestion (not a pitch). Include a Markdown link to https://refocus.co.in in that mention. Keep it to 2-3 sentences and make it feel like a genuine aside, e.g. a tool that happens to make body doubling easy.
- The rest of the article stands on its own and would be valuable even without that mention.
- Use Markdown with 3-5 "##" section headings, short paragraphs, and the occasional list. ~800-1100 words.
- Warm, concrete, second-person voice. No emojis. No "In conclusion". No made-up statistics.`;

function buildUserPrompt(topic, existingTitles) {
  const avoid =
    existingTitles.length > 0
      ? `\n\nWe have already published these titles — pick a clearly different angle and title:\n${existingTitles.map((t) => `- ${t}`).join("\n")}`
      : "";
  return `Write a blog post about: ${topic}.${avoid}

Return ONLY a JSON object with these exact keys:
{
  "title": "compelling, specific, under 70 characters, no brand name",
  "slug": "kebab-case-url-slug",
  "description": "meta description under 155 characters",
  "tags": ["2-4", "lowercase", "tags"],
  "body_markdown": "the full article body in Markdown (no H1 title inside)"
}`;
}

async function callOpenAI(apiKey, topic, existingTitles) {
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      temperature: 0.8,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildUserPrompt(topic, existingTitles) },
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
  // Belt-and-suspenders: strip any brand mention that slipped into the title.
  return title
    .replace(/\brefocus\b/gi, "")
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s:–-]+|[\s:–-]+$/g, "")
    .trim();
}

function ensureBrandMention(body) {
  if (/refocus\.co\.in/i.test(body)) return body;
  // Fallback: insert a natural aside near the middle if the model omitted it.
  const paras = body.split(/\n\n+/);
  const mid = Math.max(1, Math.floor(paras.length / 2));
  const aside =
    "If you find it hard to start alone, working alongside someone else can help. A tool like [Refocus](https://refocus.co.in) pairs you with another person for a timed session so you have quiet, low-pressure accountability — no meeting, no small talk, just two people getting things done.";
  paras.splice(mid, 0, aside);
  return paras.join("\n\n");
}

function toFrontmatter({ title, description, tags }) {
  const pubDate = new Date().toISOString();
  const q = (s) => JSON.stringify(String(s));
  const tagList = Array.isArray(tags) ? tags : [];
  return `---
title: ${q(title)}
description: ${q(description)}
pubDate: ${q(pubDate)}
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

  const existingTitles = await getExistingTitles();
  const topic = getArgTopic() || pickTopic(existingTitles);
  console.log(`Topic: ${topic}`);
  console.log(`Model: ${MODEL}`);

  const result = await callOpenAI(apiKey, topic, existingTitles);

  const title = sanitizeTitle(result.title || "");
  if (!title) throw new Error("Model did not return a usable title.");
  const description = String(result.description || "").slice(0, 160);
  const body = ensureBrandMention(String(result.body_markdown || "").trim());
  if (body.length < 200) throw new Error("Model returned an empty/short body.");

  const baseSlug = slugify(result.slug || title);
  const slug = await uniqueSlug(baseSlug);

  const contents = `${toFrontmatter({ title, description, tags: result.tags })}\n${body}\n`;
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
