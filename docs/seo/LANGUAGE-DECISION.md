# Refocus locale decision

> **Status:** Awaiting first GSC baseline. Run the commands below after completing [GSC-SETUP.md](./GSC-SETUP.md).

## Verdict (pending data)

**English-only — no Indonesian/Thai locales yet**

Until Search Console is connected, the recommendation is to fix English SEO foundations first (public `/features`, `/pricing`, marketing sitemap, content parity) rather than add translated pages.

## How to generate this report

```bash
# 1. Complete one-time GSC setup (see GSC-SETUP.md)
npm run seo:gsc:check

# 2. Pull baseline (country, query, page, indexation)
npm run seo:gsc:baseline

# 3. Auto-write locale recommendation
npm run seo:locale:decision
```

Output: this file is overwritten by `scripts/seo/analyze-locale-decision.mjs`.

## Decision rules

| GSC signal (28–90 days) | Action |
|-------------------------|--------|
| Almost no impressions from ID/TH | English-only; rank English SEA queries; consider `.com` later |
| Meaningful English impressions from ID/TH | English for SEA; add timezone/testimonials; no translation |
| Queries in Bahasa/Thai script, or ID/TH top-3 country | Add **one** locale: Indonesian (`id`) first, Thai (`th`) after parity |

## Why not translate now

- Site is English-only with no i18n infrastructure
- `.co.in` geo-signals India; many SEA productivity searches are still in English
- Machine-translated pages without hreflang and content parity risk thin duplicate content
