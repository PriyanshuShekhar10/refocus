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

- Content: `src/content/blog/*.md` (Astro content collection)
- Listing: `/blog` · Post: `/blog/<slug>`
- Sitemap: `/sitemap.xml` (generated at build time, includes posts)

### Write a post by hand

Add a Markdown file under `src/content/blog/` with frontmatter:

```yaml
---
title: "Your title (no brand name)"
description: "Meta description under ~155 chars"
pubDate: 2026-08-08
tags: ["focus", "deep work"]
author: "Refocus Team"
draft: false
---
```

### Generate a post with OpenAI

```bash
# from marketing/
npm run blog:new
npm run blog:new -- --topic "how to start deep work when you feel stuck"
```

The script is designed to write a useful article and mention Refocus **once in the middle** (never in the title), with a link to https://refocus.co.in.

### Hourly automation

GitHub Action **“Auto-generate blog post”** (`.github/workflows/blog.yml`):

1. Checks out `landing` (repo default)
2. Runs the generator
3. Commits the new Markdown to `landing`
4. Builds Astro and deploys to Cloudflare Pages

It does **not** push to `test-dash`, so Vercel is unaffected. Because `landing` is the default branch, hourly pushes also do not show GitHub’s “Compare & pull request” banner.

Manual run: GitHub → Actions → Auto-generate blog post → Run workflow.

Required secrets: `OPENAI_API_KEY`, `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.

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
