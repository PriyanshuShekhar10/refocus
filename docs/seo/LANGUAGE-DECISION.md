# Refocus locale decision

> **Status:** Indonesian (`/id/`) launched 2026-09-02 per SEA content strategy. GSC baseline **not yet run** — complete service account setup per project GSC docs when ready.

## Verdict (product decision + pending GSC)

**Phase 1 live: 1 English + 2 Indonesian posts/day**

| Locale | Path | Cadence |
|--------|------|---------|
| English | `/blog/` | 1/day (06:00 UTC, `blog-slot-0`) |
| Indonesian | `/id/blog/` | 2/day (12:00 + 18:00 UTC, `blog-id-slot-0/1`) |
| Thai | `/th/` | Phase 2 — after ~4–6 weeks ID metrics |

Workflows run from the **`landing` branch** (this repo). No blog cron changes on `test-dash`.

## Decision rules (for phase 2 Thai)

| GSC signal (28–90 days) | Action |
|-------------------------|--------|
| Almost no impressions from ID/TH | Keep EN+ID mix; optimize English SEA geo posts |
| Meaningful English impressions from ID/TH | English for SEA; add timezone/testimonials |
| Queries in Bahasa/Thai script, or ID/TH top-3 country | ID already live; add **Thai (`th`)** at 1/day if TH crosses thresholds |

## Why Indonesian first

- Largest SEA population + clear language boundary
- Native Bahasa posts for UTBK/SNBT intent (not translation of English archive)
- hreflang + localized slugs on `/id/` reduce duplicate-content risk
- Dashboard remains English; blogs are top-of-funnel
