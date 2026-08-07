# Refocus marketing site

Astro static site for **https://refocus.co.in** (landing, careers, blog).

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

### Niches (5 separate daily crons)

| Niche | Workflow | UTC cron | ~IST | Local script |
| --- | --- | --- | --- | --- |
| Productivity (generic) | `Blog: Productivity` | `0 6 * * *` | 11:30 | `npm run blog:productivity` |
| ADHD & mental health | `Blog: ADHD & mental health` | `0 9 * * *` | 14:30 | `npm run blog:adhd` |
| Competitive exams | `Blog: Competitive exams` | `0 12 * * *` | 17:30 | `npm run blog:exams` |
| Loneliness / studying alone | `Blog: Loneliness & studying alone` | `0 15 * * *` | 20:30 | `npm run blog:loneliness` |
| Remote work & freelancing | `Blog: Remote work & freelancing` | `0 18 * * *` | 23:30 | `npm run blog:remote` |

**Five posts per day** (one per niche), staggered so deploys don’t collide. Each job checks out `landing`, commits there, builds, and deploys to Cloudflare — never touches `test-dash` / Vercel.

Topic pools + prompts: `scripts/blog-categories.mjs`. Generator: `scripts/generate-post.mjs`.

### Write a post by hand

```yaml
---
title: "Your title (no brand name)"
description: "Meta description under ~155 chars"
pubDate: 2026-08-08
category: exams   # productivity | adhd | exams | loneliness | remote
tags: ["jee", "focus"]
author: "Refocus Team"
draft: false
---
```

### Generate with OpenAI

```bash
npm run blog:exams
npm run blog:adhd -- --topic "body doubling for ADHD study sessions"
npm run blog:new -- --category loneliness
```

Each generated post should include **3–5 outbound links** (NTA, UPSC, CDC/CHADD, APA, etc.). Refocus may appear at most once mid-article, or not at all.

### Manual run in GitHub

Actions → pick a niche workflow (e.g. **Blog: Competitive exams**) → Run workflow.

Required secrets (on the repo): `OPENAI_API_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

**Note:** Scheduled workflows run from the **default branch** (`test-dash`). The niche workflow files must exist there; they always check out `landing` for content.
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
- Logged-in visitors (valid NextAuth JWT on `.refocus.co.in`) hitting `/` or `/career` → redirect to the dashboard

## SEO notes

- Canonical host is the **apex** (`refocus.co.in`)
- Self-referencing canonicals + Open Graph + `BlogPosting` JSON-LD on posts
- Dashboard host is `noindex` and permanently redirects `/` + `/career` to the apex
