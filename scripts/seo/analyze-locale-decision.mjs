#!/usr/bin/env node
/**
 * Reads docs/seo/reports/gsc-baseline-latest.json and recommends whether to
 * add Indonesian, Thai, or stay English-only for SEA expansion.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "../..");
const BASELINE = path.join(ROOT, "docs/seo/reports/gsc-baseline-latest.json");
const OUT = path.join(ROOT, "docs/seo/LANGUAGE-DECISION.md");

const SEA_COUNTRIES = new Set(["idn", "tha", "sgp", "mys", "phl", "vnm"]);
const INDIA = "ind";

function pct(n, total) {
  if (!total) return "0%";
  return `${((n / total) * 100).toFixed(1)}%`;
}

function loadBaseline() {
  if (!fs.existsSync(BASELINE)) {
    console.error(`Missing ${BASELINE}`);
    console.error("Run: npm run seo:gsc:baseline");
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(BASELINE, "utf8"));
}

function sumImpressions(rows) {
  return (rows ?? []).reduce((s, r) => s + (r.impressions ?? 0), 0);
}

function topCountries(data) {
  const rows = data.countries?.rows ?? [];
  return rows
    .map((r) => ({
      country: r.keys?.[0] ?? r.country ?? "unknown",
      clicks: r.clicks ?? 0,
      impressions: r.impressions ?? 0,
      ctr: r.ctr ?? 0,
      position: r.position ?? 0,
    }))
    .sort((a, b) => b.impressions - a.impressions);
}

function seaShare(countries, totalImpressions) {
  const sea = countries.filter((c) => SEA_COUNTRIES.has(c.country.toLowerCase()));
  const seaImpressions = sumImpressions(sea);
  return { sea, seaImpressions, share: seaImpressions / (totalImpressions || 1) };
}

function detectNonEnglishQueries(queries) {
  const rows = queries?.rows ?? [];
  const nonLatin = [];
  for (const r of rows) {
    const q = r.keys?.[0] ?? "";
    if (/[\u0E00-\u0E7F\u0980-\u09FF\u4E00-\u9FFF]/.test(q)) nonLatin.push(q);
    if (/\b(bahasa|indonesia|thai|virtual coworking indonesia)\b/i.test(q)) {
      nonLatin.push(q);
    }
  }
  return [...new Set(nonLatin)].slice(0, 20);
}

function decide({ seaSharePct, idnImpressions, thaImpressions, nonEnglishQueries, indiaSharePct }) {
  if (seaSharePct < 0.05 && idnImpressions < 50 && thaImpressions < 50) {
    return {
      verdict: "English-only (no locales yet)",
      rationale:
        "SEA countries account for less than 5% of impressions and ID/TH each have fewer than 50 impressions. Invest in English SEO pages and competitor comparisons before translating.",
      next: [
        "Expand English topic landers (body doubling, virtual coworking, study-with-me)",
        "Publish comparison content (Focusmate, FLOWN, Cofocus)",
        "Re-run baseline in 90 days",
      ],
    };
  }

  if (seaSharePct >= 0.05 && nonEnglishQueries.length === 0) {
    return {
      verdict: "English for SEA (no translation yet)",
      rationale:
        "Meaningful SEA traffic in English. Add timezone/social proof for ID/TH users but keep pages in English.",
      next: [
        "Add SEA-friendly session times on marketing copy",
        "Testimonials from Indonesia/Thailand users if available",
        "Monitor non-English query growth monthly",
      ],
    };
  }

  if (nonEnglishQueries.length >= 5 || idnImpressions >= 200 || thaImpressions >= 200) {
    const firstLocale = idnImpressions >= thaImpressions ? "id (Indonesian)" : "th (Thai)";
    return {
      verdict: `Add ${firstLocale} as first locale`,
      rationale:
        "Non-English queries or strong ID/TH impression volume suggests localized money pages would rank. Start with one locale at content parity (home + 3 landers + pricing), not machine-translated blog.",
      next: [
        `Implement /${firstLocale.split(" ")[0]} path prefix on marketing site`,
        "Hreflang mesh + x-default → English",
        "Native copy for homepage, body-doubling, virtual-coworking, pricing",
      ],
    };
  }

  return {
    verdict: "Watch and wait (90 days)",
    rationale: "Some SEA signal but not enough for full i18n. Keep English, re-measure.",
    next: ["Run npm run seo:gsc:baseline monthly", "Track IDN/THA in GSC country report"],
  };
}

const data = loadBaseline();
const countries = topCountries(data);
const totalImpressions =
  data.overview?.totals?.impressions ?? sumImpressions(countries);
const { sea, seaImpressions, share } = seaShare(countries, totalImpressions);
const idn = countries.find((c) => c.country.toLowerCase() === "idn");
const tha = countries.find((c) => c.country.toLowerCase() === "tha");
const ind = countries.find((c) => c.country.toLowerCase() === INDIA);
const nonEnglish = detectNonEnglishQueries(data.queries);
const decision = decide({
  seaSharePct: share,
  idnImpressions: idn?.impressions ?? 0,
  thaImpressions: tha?.impressions ?? 0,
  nonEnglishQueries: nonEnglish,
  indiaSharePct: (ind?.impressions ?? 0) / (totalImpressions || 1),
});

const md = `# Refocus locale decision (auto-generated)

Generated: ${new Date().toISOString()}
Source: \`docs/seo/reports/gsc-baseline-latest.json\`
Property: ${data.property ?? "https://refocus.co.in/"}
Window: last ${data.days ?? 90} days

## Verdict

**${decision.verdict}**

${decision.rationale}

## Traffic snapshot

| Metric | Value |
|--------|-------|
| Total impressions | ${totalImpressions.toLocaleString()} |
| India (IND) share | ${pct(ind?.impressions ?? 0, totalImpressions)} (${(ind?.impressions ?? 0).toLocaleString()} imp) |
| SEA share (ID/TH/SG/MY/PH/VN) | ${pct(seaImpressions, totalImpressions)} (${seaImpressions.toLocaleString()} imp) |
| Indonesia (IDN) | ${(idn?.impressions ?? 0).toLocaleString()} impressions |
| Thailand (THA) | ${(tha?.impressions ?? 0).toLocaleString()} impressions |
| Non-English query samples | ${nonEnglish.length} |

## Top countries

| Country | Impressions | Clicks | Avg position |
|---------|-------------|--------|--------------|
${countries
  .slice(0, 10)
  .map(
    (c) =>
      `| ${c.country.toUpperCase()} | ${c.impressions.toLocaleString()} | ${c.clicks.toLocaleString()} | ${(c.position ?? 0).toFixed(1)} |`,
  )
  .join("\n")}

## Recommended next steps

${decision.next.map((n) => `- ${n}`).join("\n")}

## Decision rules (reference)

| Signal | Action |
|--------|--------|
| SEA < 5% impressions, ID/TH < 50 each | English-only; no locales |
| SEA ≥ 5%, queries in English | English for SEA; add local proof |
| Non-English queries ≥ 5 OR ID/TH ≥ 200 imp | Add one locale (id first if ID ≥ TH) |

Re-run after new baseline: \`npm run seo:gsc:baseline && npm run seo:locale:decision\`
`;

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, md);
console.log(`Wrote ${OUT}`);
console.log(`Verdict: ${decision.verdict}`);
