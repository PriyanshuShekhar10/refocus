# Refocus locale decision

> **Status:** 4-locale blog cadence live on `landing` (2026-09-03). Default branch switched to `landing` so scheduled crons fire. GSC baseline **not yet run** — complete service account setup per project GSC docs when ready.

## Verdict (product decision + pending GSC)

**Phase 1 live: 4 posts/day — global EN + ID + FIL + VI**

| UTC | Locale | Path | Cadence | Workflow |
|-----|--------|------|---------|----------|
| 06:00 | Global English | `/blog/` | 1/day | `blog-slot-0` |
| 10:00 | Indonesian | `/id/blog/` | 1/day | `blog-id-slot-0` |
| 14:00 | Filipino (Tagalog) | `/fil/blog/` | 1/day | `blog-fil-slot-0` |
| 18:00 | Vietnamese | `/vi/blog/` | 1/day | `blog-vi-slot-0` |

**English content:** productivity, ADHD, remote work, loneliness, and generic **study & focus** — **no** India-specific exams (UPSC, NEET, JEE, etc.) in new cron output.

**Locale-specific exams:** UTBK/SNBT (ID), board exam / UPCAT / BPO (FIL), THPT / đại học (VI).

Workflows run from the **`landing` branch** (default branch). No blog cron changes on `test-dash`.

`blog-id-slot-1` cron is **disabled** (manual dispatch only).

## Blog-first vs money pages

| Locale | Money pages (`/pricing`, `/body-doubling`, …) | Blog |
|--------|-----------------------------------------------|------|
| English | Full | `/blog/` |
| Indonesian | `/id/*` | `/id/blog/` |
| Filipino | Blog-first only (`/fil/`, `/fil/blog/`) | `/fil/blog/` |
| Vietnamese | Blog-first only (`/vi/`, `/vi/blog/`) | `/vi/blog/` |

## Decision rules (for phase 2 Thai)

| GSC signal (28–90 days) | Action |
|-------------------------|--------|
| Almost no impressions from ID/PH/VN | Keep 4-locale mix; optimize English global posts |
| Meaningful English impressions from SEA | English for SEA; add timezone/testimonials |
| Queries in local script, or country top-3 | Scale winning locale; add **Thai (`th`)** at 1/day if TH crosses thresholds |

## Why these four locales

- **Indonesia:** largest SEA population; UTBK/SNBT intent in Bahasa
- **Philippines:** Tagalog at `/fil/` for board exam, UPCAT, BPO — not English geo posts
- **Vietnam:** THPT and đại học prep; growing remote/freelancer base
- **English:** global top-of-funnel; dashboard remains English

hreflang: EN↔ID on money pages; all four blog hubs linked on `/blog` index alternates.

## Cron registration

GitHub scheduled workflows only run from the **default branch**. Default branch is **`landing`** so blog crons execute. Vercel production deploy can remain on `test-dash` for the app; marketing site deploys from `landing` via workflow.
