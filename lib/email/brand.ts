import fs from "fs";
import path from "path";

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

/** Inline logo so images work in email clients (localhost URLs never load). */
export function getEmailLogoDataUri(): string {
  if (logoDataUriCache) return logoDataUriCache;
  const logoPath = path.join(process.cwd(), "public", "brand", "logo.png");
  const buf = fs.readFileSync(logoPath);
  logoDataUriCache = `data:image/png;base64,${buf.toString("base64")}`;
  return logoDataUriCache;
}
