const FALLBACK_APP_URL = "http://localhost:3000";
const FALLBACK_MARKETING_URL = "http://localhost:4321";
const PROD_APP_URL = "https://dashboard.refocus.co.in";
const PROD_MARKETING_URL = "https://refocus.co.in";

function normalizeUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

function stripWww(url: string): string {
  return url.replace(/^(https?:\/\/)www\./i, "$1");
}

function firstEnvUrl(...keys: string[]): string {
  for (const key of keys) {
    const raw = process.env[key]?.trim();
    if (raw) return stripWww(normalizeUrl(raw));
  }
  return "";
}

function isLocalhost(url: string): boolean {
  return /localhost|127\.0\.0\.1/i.test(url);
}

/**
 * Product / dashboard origin (auth, API, sessions).
 * Prefer NEXTAUTH_URL / NEXT_PUBLIC_APP_URL so email links never point at the
 * Astro marketing apex (which has no /api/auth/* or /auth/* routes).
 */
export function getAppUrl(): string {
  const fromEnv = firstEnvUrl(
    "NEXT_PUBLIC_APP_URL",
    "APP_URL",
    "NEXTAUTH_URL",
  );
  if (fromEnv) {
    // Never ship a localhost link from a production/Vercel build.
    if (process.env.VERCEL_ENV === "production" && isLocalhost(fromEnv)) {
      return PROD_APP_URL;
    }
    return fromEnv;
  }

  if (process.env.VERCEL_ENV === "production") return PROD_APP_URL;
  if (process.env.VERCEL_URL) {
    return normalizeUrl(`https://${process.env.VERCEL_URL}`);
  }
  return FALLBACK_APP_URL;
}

/**
 * Marketing / apex origin (public site, email assets).
 * Do not use for auth or app deep links.
 */
export function getMarketingSiteUrl(): string {
  const fromEnv = firstEnvUrl("NEXT_PUBLIC_SITE_URL", "SITE_URL");
  if (fromEnv) {
    if (process.env.VERCEL_ENV === "production" && isLocalhost(fromEnv)) {
      return PROD_MARKETING_URL;
    }
    return fromEnv;
  }

  if (process.env.VERCEL_ENV === "production") return PROD_MARKETING_URL;
  return FALLBACK_MARKETING_URL;
}

/**
 * @deprecated Prefer getAppUrl() for product links or getMarketingSiteUrl()
 * for the apex. Alias of the marketing URL for callers that mean “public site”.
 */
export function getSiteUrl(): string {
  return getMarketingSiteUrl();
}
