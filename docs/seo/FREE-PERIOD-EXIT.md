# Free-period exit checklist (SEO)

Use this when Refocus leaves the temporary free period and introduces paid plans.

## 1. Redirect the campaign URL

In [`marketing/public/_redirects`](../../marketing/public/_redirects), **enable**:

```
/free /pricing 301
/free/ /pricing 301
```

Preferred target is `/pricing` (same commercial intent). `/` is acceptable only if pricing is removed.

Do **not** leave `/free` live with outdated “no session cap / unlimited free” claims.

## 2. Soften free claims on evergreen hubs

Update copy + `UPDATED` dates on:

| Page | What to change |
|------|----------------|
| `/pricing` | Real SKUs; remove “no weekly session cap” if false; honest FAQ |
| `/` (title, meta, FAQ, Offer JSON-LD) | Match current offer |
| `/focusmate-alternative` | Free-plan table row + FAQ |
| `/flown-alternative` | Pricing row + “free alternative” FAQ |
| `/cofocus-alternative` | Free FAQ |
| `/virtual-coworking` | “Is there free virtual coworking?” FAQ |
| `/body-doubling` | “Free body doubling tool?” FAQ |
| `/study-with-me` | “Free study with me?” FAQ |
| Nav / footer | Keep or drop “Free” link (if redirected, link can stay as `/free` → pricing) |

## 3. Schema

- SoftApplication `offers.price` must match reality (0 only if a true free tier remains).
- FAQ answers must not contradict pricing.

## 4. Blog posts

Do **not** mass-delete. For posts that hard-claim unlimited free:

- Edit the outdated sentences
- Set `updatedDate` in frontmatter
- Keep links to `/pricing` and `/focusmate-alternative`

Flagship posts from the free campaign:

- `/blog/best-free-virtual-coworking-options-2026`
- `/blog/focusmate-free-tier-limits-explained`

## 5. What not to do

- Do not create `/free-coworking` (or other free-* category URLs) at exit — they were never the strategy.
- Do not 404 `/free` without a 301.
- Do not claim “forever free” in new copy if plans are paid.

## 6. Verify after deploy

- [ ] `curl -I https://refocus.co.in/free` → 301 → `/pricing`
- [ ] Sitemap still lists `/pricing`; `/free` can remain (redirect) or be removed from sitemap after redirect is live
- [ ] Spot-check Google Search Console for soft 404s on old free URLs
- [ ] Homepage + pricing FAQ match the live offer
