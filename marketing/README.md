# Refocus marketing site

Astro static site for **https://refocus.co.in** (landing, blog).

This folder only exists on the **`landing`** branch. The product dashboard lives on **`test-dash`** and deploys to Vercel — see the [root README](../README.md).

## Local development

```bash
git checkout landing
cd marketing
npm install
npm run dev       # http://localhost:4321
npm run build     # output → dist/
npm run preview   # preview the production build
```

### Environment

Create `marketing/.env` or put these in the repo-root `.env` (the blog script loads both):

| Variable | Used by | Example |
| --- | --- | --- |
| `PUBLIC_APP_URL` | Build-time CTAs / auth links | `https://dashboard.refocus.co.in` |
| `OPENAI_API_KEY` | `npm run blog:new` | (secret) |
| `PUBLIC_GA_MEASUREMENT_ID` | Google Analytics 4 (`G-XXXXXXXX`) | GitHub Actions **variable** (optional) |
| `PUBLIC_POSTHOG_KEY` | PostHog project API key (`phc_…`) | GitHub Actions **variable** |
| `PUBLIC_POSTHOG_HOST` | PostHog ingest host | `https://us.i.posthog.com` (or `https://eu.i.posthog.com`) |

### PostHog

You already have a PostHog account. CLI login needs a browser once; then:

1. Open [PostHog → Project settings](https://us.posthog.com/settings/project) (or EU equivalent).
2. Copy **Project API Key** (`phc_…`).
3. Set GitHub variables (from this machine):

```bash
gh variable set PUBLIC_POSTHOG_KEY --body "phc_YOUR_KEY"
gh variable set PUBLIC_POSTHOG_HOST --body "https://us.i.posthog.com"
```

4. Redeploy marketing (push or **Deploy marketing site**).

Locally you can put the same keys in `marketing/.env`. The snippet loads from `Base.astro` only when `PUBLIC_POSTHOG_KEY` is set. Cookies use `cross_subdomain_cookie` so the same person can be followed onto `dashboard.refocus.co.in` once the Next app is instrumented too.

### Google Analytics 4

1. Create a GA4 property at [analytics.google.com](https://analytics.google.com/) → Admin → Create property → Web stream for `https://refocus.co.in`.
2. Copy the **Measurement ID** (`G-XXXXXXXX`).
3. `gh variable set PUBLIC_GA_MEASUREMENT_ID --body "G-XXXXXXXX"`
4. Redeploy.

Both GA4 and PostHog can run together; either alone is fine.

Cloudflare Pages (production) also needs Function env:

| Variable | Purpose |
| --- | --- |
| `NEXTAUTH_SECRET` | Same as the Next app — verifies shared session JWT |
| `DASHBOARD_URL` | Redirect target for logged-in visitors (`https://dashboard.refocus.co.in`) |

## Blog

Goal: **useful, searchable content that ranks** — not product pitches. Posts should help people even if they never try Refocus. Soft brand mentions are optional; outbound links to real resources are required.

- Content: `src/content/blog/*.md`
- Listing: `/blog` · Post: `/blog/<slug>`
- Sitemap: `/sitemap.xml` (includes posts)

### Cadence (1 English + 1 rotating locale + 1 German / day)

One scheduled English slot rotates through **ten community niches** (med-school, phd, engineers, parents, career-switch, writers, law, nurses, founders, teachers) via `DAY % 10`. Afternoon/evening English slots are **manual only**. Locale and German jobs keep the original five niches (productivity, ADHD, exams, loneliness, remote). SEA locale cycles **id → fil → vi** by UTC day. The generator proposes a topic first, clash-checks, and pivots before writing; drafts are quality-gated (length ≥900 words, headings, in-body outbound links — Further reading alone does not count). Soft-accept is disabled in CI (`STRICT_QUALITY=1`). **Illustrations are skipped in GitHub Actions** (`SKIP_IMAGE=1`) to save OpenAI image tokens; local `npm run blog:*` still generates an image unless you pass `--skip-image`.

| Slot | Workflow | Locale | UTC cron | ~IST |
| --- | --- | --- | --- | --- |
| 0 | `Blog: morning slot (English)` | en | `0 6 * * *` | 11:30 |
| Locale | `Blog: locale daily (id / fil / vi)` | id/fil/vi | `0 14 * * *` | 19:30 |
| German | `Blog: German daily` | de | `0 16 * * *` | 21:30 |

Afternoon / evening English workflows exist for **manual** runs only (no schedule).

| Niche | Manual workflow | Local script | Scheduled? |
| --- | --- | --- | --- |
| Med school & residency | `Blog: Med school & residency` | `npm run blog:med-school` | EN morning |
| PhD & dissertation | `Blog: PhD & dissertation` | `npm run blog:phd` | EN morning |
| Software engineers | `Blog: Software engineers` | `npm run blog:engineers` | EN morning |
| Working parents | `Blog: Working parents` | `npm run blog:parents` | EN morning |
| Career switchers | `Blog: Career switchers` | `npm run blog:career-switch` | EN morning |
| Writers & long-form | `Blog: Writers & long-form` | `npm run blog:writers` | EN morning |
| Law school & articling | `Blog: Law school & articling` | `npm run blog:law` | EN morning |
| Nursing & shift work | `Blog: Nursing & shift work` | `npm run blog:nurses` | EN morning |
| Founders & indie makers | `Blog: Founders & indie makers` | `npm run blog:founders` | EN morning |
| Teachers & educators | `Blog: Teachers & educators` | `npm run blog:teachers` | EN morning |
| Productivity | `Blog: Productivity` | `npm run blog:productivity` | Locale / DE |
| ADHD & mental health | `Blog: ADHD & mental health` | `npm run blog:adhd` | Locale / DE |
| Competitive exams | `Blog: Competitive exams` | `npm run blog:exams` | Locale / DE |
| Loneliness / studying alone | `Blog: Loneliness & studying alone` | `npm run blog:loneliness` | Locale / DE |
| Remote work & freelancing | `Blog: Remote work & freelancing` | `npm run blog:remote` | Locale / DE |

**Three posts per day total** (1 EN + 1 rotating locale + 1 DE), staggered so deploys don’t collide. Each job checks out `landing`, commits there only when a post clears the quality gate (markdown always; `public/blog/` images only when generated locally), then builds and deploys to Cloudflare — never touches `test-dash` / Vercel. Empty runs skip Cloudflare deploy. Per-niche and per-locale workflows are **manual only**.

Topic pools + prompts: `scripts/blog-categories.mjs` (+ locale variants). Generator: `scripts/generate-post.mjs`.

### Write a post by hand

```yaml
---
title: "Your title (no brand name)"
description: "Meta description under ~155 chars"
pubDate: 2026-08-08
category: med-school   # see CATEGORY_IDS in scripts/blog-categories.mjs
tags: ["anki", "focus"]
author: "Refocus Team"
draft: false
---
```

### Generate with OpenAI

```bash
npm run blog:med-school
npm run blog:engineers -- --topic "protecting maker time after standups"
npm run blog:new -- --category parents --skip-image
```

Each generated post should include **3–5 outbound links** (CDC/CHADD, APA, Khan Academy, etc.). Refocus may appear at most once mid-article, or not at all.

### Manual run in GitHub

Actions → pick a daily English slot, **Blog: locale daily**, or a niche workflow (e.g. **Blog: Med school & residency**) → Run workflow.

Required secrets (on the repo): `OPENAI_API_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

**Note:** Scheduled workflows run from the **default branch** (`test-dash`). They always check out `landing` for content.
## Deploy

- **On push** to `landing` (paths under `marketing/`): workflow `Deploy marketing site`
- **From the blog cron / manual generate**: deploy step in the same job
- Wrangler project name: `refocus-marketing`
- Cloudflare Pages production branch: `landing`

```bash
# manual deploy from your machine (after npm run build)
npx wrangler pages deploy dist --project-name refocus-marketing --branch landing
```

## Middleware

`functions/_middleware.ts` (Cloudflare Pages Function):

- `www.refocus.co.in` → 301 to apex
- Non-canonical hosts (`*.pages.dev`, previews) get `X-Robots-Tag: noindex, nofollow`
- Logged-in visitors (valid NextAuth JWT on `.refocus.co.in`) hitting `/` → redirect to the dashboard

## SEO notes

- Canonical host is the **apex** (`refocus.co.in`)
- Self-referencing canonicals + Open Graph + `BlogPosting` JSON-LD on posts
- Dashboard host is `noindex` and permanently redirects `/` to the apex
