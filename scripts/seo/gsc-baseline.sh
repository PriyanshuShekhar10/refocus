#!/usr/bin/env bash
# Pull a Search Console baseline for refocus.co.in via the claude-seo CLI.
# Requires Tier-1 credentials — see docs/seo/GSC-SETUP.md.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT_DIR="$ROOT/docs/seo/reports"
CLI="$HOME/.cursor/skills/seo/bin/claude-seo"
PROPERTY="${GSC_PROPERTY:-https://refocus.co.in/}"
DAYS="${GSC_DAYS:-90}"
TS="$(date -u +%Y-%m-%dT%H%M%SZ)"
REPORT="$OUT_DIR/gsc-baseline-$TS.json"

mkdir -p "$OUT_DIR"

echo "Checking Google API credentials…"
if ! "$CLI" run google_auth.py --check gsc --json | grep -q '"available": true'; then
  echo ""
  echo "GSC credentials not configured."
  echo "Follow docs/seo/GSC-SETUP.md, then re-run: npm run seo:gsc:baseline"
  exit 1
fi

echo "Pulling Search Console data for $PROPERTY (last $DAYS days)…"

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

"$CLI" run gsc_query.py --property "$PROPERTY" --days "$DAYS" --json \
  > "$TMP/overview.json" 2>"$TMP/overview.err" || {
  cat "$TMP/overview.err" >&2
  exit 1
}

"$CLI" run gsc_query.py --property "$PROPERTY" --days "$DAYS" --dimensions country --json \
  > "$TMP/country.json"

"$CLI" run gsc_query.py --property "$PROPERTY" --days "$DAYS" --dimensions query --limit 500 --json \
  > "$TMP/queries.json"

"$CLI" run gsc_query.py --property "$PROPERTY" --days "$DAYS" --dimensions page --limit 200 --json \
  > "$TMP/pages.json"

"$CLI" run gsc_query.py sitemaps --property "$PROPERTY" --json \
  > "$TMP/sitemaps.json"

INSPECT_URLS=(
  "https://refocus.co.in/"
  "https://refocus.co.in/body-doubling"
  "https://refocus.co.in/virtual-coworking"
  "https://refocus.co.in/study-with-me"
  "https://refocus.co.in/focusmate-alternative"
  "https://refocus.co.in/blog"
  "https://refocus.co.in/features"
  "https://refocus.co.in/pricing"
)

INSPECT_JSON="[]"
for url in "${INSPECT_URLS[@]}"; do
  echo "Inspecting $url…"
  row="$("$CLI" run gsc_inspect.py "$url" --json 2>/dev/null || echo '{}')"
  INSPECT_JSON="$(node -e "
    const arr = JSON.parse(process.argv[1]);
    const row = JSON.parse(process.argv[2]);
    arr.push({ url: process.argv[3], ...row });
    console.log(JSON.stringify(arr));
  " "$INSPECT_JSON" "$row" "$url")"
done

echo "$INSPECT_JSON" > "$TMP/inspections.json"

node -e "
const fs = require('fs');
const path = require('path');
const report = {
  generatedAt: new Date().toISOString(),
  property: process.argv[1],
  days: Number(process.argv[2]),
  overview: JSON.parse(fs.readFileSync(process.argv[3], 'utf8')),
  countries: JSON.parse(fs.readFileSync(process.argv[4], 'utf8')),
  queries: JSON.parse(fs.readFileSync(process.argv[5], 'utf8')),
  pages: JSON.parse(fs.readFileSync(process.argv[6], 'utf8')),
  sitemaps: JSON.parse(fs.readFileSync(process.argv[7], 'utf8')),
  inspections: JSON.parse(fs.readFileSync(process.argv[8], 'utf8')),
};
fs.writeFileSync(process.argv[9], JSON.stringify(report, null, 2));
fs.symlinkSync(path.basename(process.argv[9]), path.join(path.dirname(process.argv[9]), 'gsc-baseline-latest.json'));
" "$PROPERTY" "$DAYS" \
  "$TMP/overview.json" \
  "$TMP/country.json" \
  "$TMP/queries.json" \
  "$TMP/pages.json" \
  "$TMP/sitemaps.json" \
  "$TMP/inspections.json" \
  "$REPORT"

echo ""
echo "Baseline saved to $REPORT"
echo "Run locale decision: npm run seo:locale:decision"
