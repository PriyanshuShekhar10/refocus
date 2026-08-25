<h1 align="center">Refocus</h1>

<p align="center">Virtual co-working for deep work — focus together, quietly.</p>

## Architecture (read this first)

Refocus is split across **two branches**, **two hosts**, and **two deploy targets**. Do not mix them.

| What | Branch | Host | Platform |
| --- | --- | --- | --- |
| Marketing site + blog (Astro) | `landing` | [refocus.co.in](https://refocus.co.in) | Cloudflare Pages |
| Product app (Next.js) | `test-dash` (default) | [dashboard.refocus.co.in](https://dashboard.refocus.co.in) | Vercel |

```
refocus.co.in          →  Astro (marketing/, branch: landing)     →  Cloudflare Pages
www.refocus.co.in      →  301 → apex
dashboard.refocus.co.in →  Next.js app (branch: test-dash)         →  Vercel
                        ↳  / and /career permanently redirect to apex
```

### Why two branches?

The blog auto-publishes **3 posts/day**, rotating through the 5 niches (productivity, ADHD, exams, loneliness, remote) so each niche gets equal coverage over a 5-day cycle. Those commits must not touch `test-dash`, or Vercel would redeploy the dashboard on every blog push. Marketing lives only on `landing`; the dashboard branch has **no** `marketing/` folder.

### Shared auth

Login/signup live on the dashboard host. The session cookie is scoped to `.refocus.co.in` (`AUTH_COOKIE_DOMAIN`) so the marketing site can detect a logged-in user and send them to `/dashboard`. Logout returns to the apex marketing site.

### Which branch should I check out?

| Working on… | Checkout |
| --- | --- |
| Dashboard, APIs, auth, sessions, chat | `test-dash` |
| Landing page, careers, blog, SEO | `landing` |

```bash
git checkout test-dash   # this repo clone on the default branch
git checkout landing     # marketing site + blog content
```

---

## Features (product app)

- Next.js App Router (dashboard, sessions, friends, chat)
- Auth: NextAuth (credentials + Firebase Google), MongoDB adapter, JWT sessions
- MongoDB via the official Node driver
- Tailwind CSS + shadcn/ui
- Friends, session requests, realtime chat (SSE)
- Video sessions via Daily.co
- Ably for presence / realtime where used

Marketing (on `landing`): Astro static site, React islands, SEO blog with OpenAI-assisted posts.

---

## Getting started — dashboard (`test-dash`)

1. Ensure you are on the dashboard branch:

```bash
git checkout test-dash
```

2. Copy `.env.example` to `.env` / `.env.local` and fill in values. Locally leave `AUTH_COOKIE_DOMAIN` unset. See `.env.example` for the full list.

Minimum to boot:

```
MONGODB_URI=mongodb+srv://...
NEXTAUTH_SECRET=your-long-random-secret
NEXTAUTH_URL=http://localhost:3000
DAILY_API_KEY=...
DAILY_DOMAIN=your-subdomain.daily.co
# Optional additional Daily accounts (switch in Admin → Config):
# DAILY_API_KEY_2=...
# DAILY_DOMAIN_2=other-subdomain.daily.co
```

3. Install and run:

```bash
npm install
npm run dev
```

App: http://localhost:3000

### Useful scripts

```bash
npm run dev      # development
npm run build    # typecheck + production build
npm run start    # production server after build
```

---

## Getting started — marketing (`landing`)

```bash
git checkout landing
cd marketing
npm install
npm run dev          # http://localhost:4321
npm run build        # static output in dist/
npm run blog:new     # generate one blog post (needs OPENAI_API_KEY)
```

Full details: [`marketing/README.md`](https://github.com/PriyanshuShekhar10/refocus/blob/landing/marketing/README.md) (only exists on the `landing` branch).

---

## Production domains & env

### Dashboard (Vercel, `test-dash`)

| Variable | Production value |
| --- | --- |
| `NEXTAUTH_URL` | `https://dashboard.refocus.co.in` |
| `AUTH_COOKIE_DOMAIN` | `.refocus.co.in` |
| `NEXT_PUBLIC_SITE_URL` | `https://refocus.co.in` |

Also set MongoDB, Daily, Firebase, Resend, Blob, etc. (see `.env.example`).

### Marketing (Cloudflare Pages, `landing`)

| Variable | Purpose |
| --- | --- |
| `PUBLIC_APP_URL` | `https://dashboard.refocus.co.in` (CTA / auth links) |
| `NEXTAUTH_SECRET` | Same secret as the Next app (Pages Function verifies JWT) |
| `DASHBOARD_URL` | `https://dashboard.refocus.co.in` (logged-in redirect target) |

### GitHub Actions secrets (blog + CF deploy)

| Secret | Purpose |
| --- | --- |
| `OPENAI_API_KEY` | Blog post generation |
| `CLOUDFLARE_API_TOKEN` | Pages deploy via Wrangler |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account |

Optional repo variable: `OPENAI_MODEL` (defaults to `gpt-4o-mini`).

---

## CI / CD

| Trigger | What happens |
| --- | --- |
| Push to `test-dash` | Vercel rebuilds the dashboard |
| Push to `landing` under `marketing/` | GitHub Action builds Astro and deploys to Cloudflare Pages |
| Daily blog slots (3×/day, rotating niches) | Generates a post on `landing`, builds, deploys to Cloudflare — **does not** push to `test-dash` |
| Manual: Actions → a niche workflow or a daily slot | Same as cron; niche workflows pin the category |

The blog workflow files live on the **default branch** (`test-dash`) because GitHub only schedules from the default branch. The job always **checks out and pushes to `landing`**.

Workflow files:

- `.github/workflows/blog-slot-*.yml` — 3 daily rotating posts + CF deploy
- `.github/workflows/blog-*.yml` — per-niche **manual** generate
- `.github/workflows/deploy-marketing.yml` — on `landing` only; deploys marketing on push

---

## Blog (SEO)

- Posts: Markdown in `marketing/src/content/blog/` on **`landing`**
- Public URLs: `https://refocus.co.in/blog` and `/blog/<slug>`
- Sitemap: dynamic at `/sitemap.xml` (includes posts)
- Generation script: `marketing/scripts/generate-post.mjs`
  - Writes useful articles; mentions Refocus once mid-body (not in the title)
  - Requires `OPENAI_API_KEY` (repo-root `.env` locally, or GitHub secret in CI)

---

## Product notes (dashboard)

- Registration: `POST /api/auth/register`
- Login: NextAuth at `/auth/login` (also Firebase Google)
- Friends / sessions / chat backed by MongoDB
- Chat realtime via SSE (`/api/chat/.../events`)
- Session requests: create / accept / decline APIs under `/api/session-requests`
- Daily.co: `DAILY_API_KEY` / `DAILY_DOMAIN` (server-only); optional `_2`, `_3`, … pairs selectable in Admin → Config

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md). In short: branch from `test-dash` for app work, from `landing` for marketing/blog work; open a PR against the correct base branch.
