const FALLBACK_SITE_URL = "http://localhost:3000";

function normalizeUrl(value: string): string {
  return value.endsWith("/") ? value.slice(0, -1) : value;
}

export function getSiteUrl(): string {
  const envUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (!envUrl) return FALLBACK_SITE_URL;
  return normalizeUrl(envUrl);
}
