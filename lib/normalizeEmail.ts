const GMAIL_DOMAINS = new Set(["gmail.com", "googlemail.com"]);
const PLUS_ALIAS_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
]);

export const BANNED_EMAIL_ERROR =
  "This email cannot be used to create an account.";

/** Lowercased email as the user typed it (no alias collapsing). */
export function displayEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Canonical form used for uniqueness and the ban denylist.
 * Gmail: strip plus-tags and dots. Outlook/Hotmail: strip plus-tags only.
 * University and other domains are left as lowercase only.
 */
export function canonicalEmail(email: string): string {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return trimmed;

  let local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1).replace(/\.$/, "");

  if (PLUS_ALIAS_DOMAINS.has(domain)) {
    const plus = local.indexOf("+");
    if (plus >= 0) local = local.slice(0, plus);
  }

  if (GMAIL_DOMAINS.has(domain)) {
    local = local.replace(/\./g, "");
    return `${local}@gmail.com`;
  }

  return `${local}@${domain}`;
}
