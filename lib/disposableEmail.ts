import exactDomains from "disposable-email-domains";
import wildcardDomains from "disposable-email-domains/wildcard.json";

/**
 * Extra domains we want blocked even if a public list is stale.
 * Keep this small — the npm list covers the long tail.
 */
const EXTRA_BLOCKED_DOMAINS = new Set<string>([
  // Add one-offs here if abuse shows up before the package updates.
]);

const exactSet: Set<string> = new Set(
  (exactDomains as string[]).map((d) => d.toLowerCase()),
);

const wildcardSet: Set<string> = new Set(
  (wildcardDomains as string[]).map((d) => d.toLowerCase()),
);

export const DISPOSABLE_EMAIL_ERROR =
  "Temporary or disposable email addresses aren't allowed. Please use a permanent email.";

/** Extract the domain from an email (lowercased). Returns null if invalid. */
export function emailDomain(email: string): string | null {
  const trimmed = email.trim().toLowerCase();
  const at = trimmed.lastIndexOf("@");
  if (at <= 0 || at === trimmed.length - 1) return null;
  const domain = trimmed.slice(at + 1).replace(/\.$/, "");
  if (!domain || domain.includes(" ") || !domain.includes(".")) return null;
  return domain;
}

/**
 * True if this email uses a known disposable / temp-mail domain.
 * Checks the exact domain list and wildcard suffixes (e.g. *.tk temp hosts).
 */
export function isDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;

  if (exactSet.has(domain) || EXTRA_BLOCKED_DOMAINS.has(domain)) {
    return true;
  }

  // Wildcard list: domain itself or any parent suffix matches.
  // e.g. domain "foo.10mail.org" matches wildcard "10mail.org"
  const labels = domain.split(".");
  for (let i = 0; i < labels.length - 1; i++) {
    const suffix = labels.slice(i).join(".");
    if (wildcardSet.has(suffix) || EXTRA_BLOCKED_DOMAINS.has(suffix)) {
      return true;
    }
  }

  return false;
}
