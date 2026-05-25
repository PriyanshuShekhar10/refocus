import fs from "fs";
import path from "path";
import { getSiteUrl } from "@/lib/site";

/** Matches components/design/design.module.css */
export const emailBrand = {
  bg: "#f7f8fa",
  card: "#ffffff",
  ink: "#0a0a0a",
  inkSoft: "#4a4a47",
  inkMute: "#8a8a85",
  line: "#e5e7eb",
  accent: "#8fa9c2",
  accentSoft: "#e1e8f0",
  accentInk: "#ffffff",
} as const;

let logoDataUriCache: string | null = null;

function emailAssetBaseUrl(): string {
  const fromEnv =
    process.env.EMAIL_ASSET_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "");

  if (fromEnv) return fromEnv.replace(/\/$/, "");
  return getSiteUrl();
}

/**
 * Public HTTPS URL for the logo — required for Gmail, Outlook, Apple Mail, etc.
 * Most clients block or strip data: URIs in img src.
 */
export function getEmailLogoUrl(): string {
  const base = emailAssetBaseUrl();
  if (base.includes("localhost") || base.startsWith("http://127.0.0.1")) {
    return getEmailLogoDataUri();
  }
  return `${base}/brand/logo.png`;
}

/** Fallback for local dev only; do not rely on this in production emails. */
export function getEmailLogoDataUri(): string {
  if (logoDataUriCache) return logoDataUriCache;
  const logoPath = path.join(process.cwd(), "public", "brand", "logo.png");
  const buf = fs.readFileSync(logoPath);
  logoDataUriCache = `data:image/png;base64,${buf.toString("base64")}`;
  return logoDataUriCache;
}
