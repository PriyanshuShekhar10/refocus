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

### Niches (5 separate hourly crons)

| Niche | Workflow | UTC cron | Local script |
| --- | --- | --- | --- |
| Productivity (generic) | `Blog: Productivity` | `0 * * * *` | `npm run blog:productivity` |
| ADHD & mental health | `Blog: ADHD & mental health` | `12 * * * *` | `npm run blog:adhd` |
| Competitive exams | `Blog: Competitive exams` | `24 * * * *` | `npm run blog:exams` |
| Loneliness / studying alone | `Blog: Loneliness & studying alone` | `36 * * * *` | `npm run blog:loneliness` |
| Remote work & freelancing | `Blog: Remote work & freelancing` | `48 * * * *` | `npm run blog:remote` |

Crons are **staggered** (~12 min apart) so five niches ≈ five posts/hour without git push collisions. Each job checks out `landing`, commits there, builds, and deploys to Cloudflare — never touches `test-dash` / Vercel.

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
