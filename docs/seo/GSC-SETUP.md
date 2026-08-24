# Google Search Console CLI setup (Refocus)

Refocus uses the [claude-seo](https://github.com/AgriciDaniel/claude-seo) skill bundled with Cursor. It wraps Google's official Search Console API — there is no separate `gcloud` GSC command.

## One-time setup (~15 minutes)

### 1. Verify the site in Search Console

1. Open [Google Search Console](https://search.google.com/search-console)
2. Add property **`https://refocus.co.in/`** (URL prefix)
3. Verify via DNS TXT (recommended) or HTML tag
4. Optional: add **`sc-domain:refocus.co.in`** domain property to cover all subdomains including `dashboard.refocus.co.in`
5. Submit sitemap: `https://refocus.co.in/sitemap.xml`

### 2. Create a Google Cloud project

1. [console.cloud.google.com](https://console.cloud.google.com) → New project (e.g. "Refocus SEO")
2. **APIs & Services → Library** → enable:
   - **Google Search Console API**
   - PageSpeed Insights API (optional, for CWV)
   - Chrome UX Report API (optional)

### 3. Choose auth method

#### Option A — OAuth (fastest for local / solo founder)

1. **Credentials → Create → OAuth client ID → Desktop app**
2. Download `client_secret.json`
3. Run:

```bash
"$HOME/.cursor/skills/seo/bin/claude-seo" run google_auth.py --auth --creds ~/Downloads/client_secret.json
```

4. Sign in with the Google account that owns the GSC property

#### Option B — Service account (better for CI / automation)

1. **IAM → Service Accounts → Create** → download JSON key
2. Copy the service account **`client_email`**
3. GSC → **Settings → Users → Add** → paste email → **Full** permission
4. Save key to `~/.config/claude-seo/service_account.json`

### 4. Create config file

```bash
mkdir -p ~/.config/claude-seo
cp scripts/seo/google-api.example.json ~/.config/claude-seo/google-api.json
# Edit paths; do NOT commit secrets to git
```

Minimal config:

```json
{
  "default_property": "https://refocus.co.in/"
}
```

### 5. Verify

```bash
npm run seo:gsc:check
```

Expected: GSC service shows `[OK]` or `"available": true`.

## Refocus npm scripts

| Command | What it does |
|---------|--------------|
| `npm run seo:gsc:check` | Verify credentials |
| `npm run seo:gsc:baseline` | Pull 90-day country/query/page + URL inspections → `docs/seo/reports/` |
| `npm run seo:locale:decision` | Read baseline → write `docs/seo/LANGUAGE-DECISION.md` |

## Manual CLI examples

```bash
# Search performance (28 days)
"$HOME/.cursor/skills/seo/bin/claude-seo" run gsc_query.py --property "https://refocus.co.in/" --json

# By country (SEA vs India)
"$HOME/.cursor/skills/seo/bin/claude-seo" run gsc_query.py --property "https://refocus.co.in/" --dimensions country --days 90 --json

# URL indexation
"$HOME/.cursor/skills/seo/bin/claude-seo" run gsc_inspect.py https://refocus.co.in/body-doubling --json

# Sitemap status
"$HOME/.cursor/skills/seo/bin/claude-seo" run gsc_query.py sitemaps --property "https://refocus.co.in/" --json
```

## Security

- Keep `~/.config/claude-seo/` out of git
- Never commit `client_secret.json` or service account keys
- Use **Viewer/Full** (read-only) GSC access for the service account unless you need Indexing API writes

## Troubleshooting

| Error | Fix |
|-------|-----|
| `403 Forbidden` on GSC | Add service account email to GSC users, or re-run OAuth |
| `404 Not Found` | Use exact property URL: `https://refocus.co.in/` with trailing slash |
| `No credentials configured` | Create `~/.config/claude-seo/google-api.json` |
| claude-seo setup required | Run `"$HOME/.cursor/skills/seo/bin/claude-seo" setup` |
