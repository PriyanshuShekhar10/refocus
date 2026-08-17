import exactDomains from "disposable-email-domains";
import wildcardDomains from "disposable-email-domains/wildcard.json";

/**
 * High-traffic temp-mail hosts missing from the npm snapshot.
 * Keep this list for services people actually use (mail.tm, etc.).
 */
const EXTRA_BLOCKED_DOMAINS = [
  "mail.tm",
  "mail.gw",
  "tempmail.com",
  "tempmailo.net",
  "moemail.net",
  "minmail.app",
  "emailnator.com",
  "inboxes.com",
  "tmpnator.live",
  "freedl.email",
  "rteet.com",
] as const;

const LIVE_LIST_URL =
  "https://cdn.jsdelivr.net/gh/disposable/disposable-email-domains@master/domains.txt";
const LIVE_LIST_TTL_MS = 6 * 60 * 60 * 1000;
const LIVE_LIST_TIMEOUT_MS = 2500;

function toDomainArray(mod: unknown): string[] {
  if (Array.isArray(mod)) {
    return mod.filter((d): d is string => typeof d === "string");
  }
  if (mod && typeof mod === "object" && "default" in mod) {
    const inner = (mod as { default: unknown }).default;
    if (Array.isArray(inner)) {
      return inner.filter((d): d is string => typeof d === "string");
    }
  }
  return [];
}

function toDomainSet(values: readonly string[]): Set<string> {
  const set = new Set<string>();
  for (const value of values) {
    const domain = value.trim().toLowerCase();
    if (domain) set.add(domain);
  }
  return set;
}

const exactSet = toDomainSet(toDomainArray(exactDomains));
const wildcardSet = toDomainSet(toDomainArray(wildcardDomains));
const extraSet = toDomainSet(EXTRA_BLOCKED_DOMAINS);

let liveSet: Set<string> | null = null;
let liveFetchedAt = 0;
let liveInflight: Promise<Set<string> | null> | null = null;

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

function matchesDisposableSets(
  domain: string,
  sets: Array<Set<string> | null | undefined>,
): boolean {
  const labels = domain.split(".");
  for (let i = 0; i < labels.length - 1; i++) {
    const suffix = labels.slice(i).join(".");
    for (const set of sets) {
      if (set?.has(suffix)) return true;
    }
  }
  return false;
}

/** Sync check against bundled lists (no network). */
export function isListedDisposableEmail(email: string): boolean {
  const domain = emailDomain(email);
  if (!domain) return false;
  return matchesDisposableSets(domain, [exactSet, wildcardSet, extraSet]);
}

async function getLiveDisposableSet(): Promise<Set<string> | null> {
  if (process.env.NODE_ENV === "test" || process.env.VITEST) return null;
  if (liveSet && Date.now() - liveFetchedAt < LIVE_LIST_TTL_MS) return liveSet;
  if (liveInflight) return liveInflight;

  liveInflight = (async () => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), LIVE_LIST_TIMEOUT_MS);
    try {
      const res = await fetch(LIVE_LIST_URL, {
        signal: controller.signal,
        cache: "no-store",
      });
      if (!res.ok) return liveSet;
      const text = await res.text();
      const next = toDomainSet(
        text
          .split(/\r?\n/)
          .map((line) => line.trim())
          .filter((line) => line && !line.startsWith("#")),
      );
      if (next.size > 1000) {
        liveSet = next;
        liveFetchedAt = Date.now();
      }
      return liveSet;
    } catch (err) {
      console.warn("[email] live disposable-domain list fetch failed:", err);
      return liveSet;
    } finally {
      clearTimeout(timer);
      liveInflight = null;
    }
  })();

  return liveInflight;
}

/**
 * True if this email uses a known disposable / temp-mail domain.
 * Uses the bundled list plus a periodically refreshed public blocklist.
 */
export async function isDisposableEmail(email: string): Promise<boolean> {
  if (isListedDisposableEmail(email)) return true;
  const domain = emailDomain(email);
  if (!domain) return false;
  const live = await getLiveDisposableSet();
  return matchesDisposableSets(domain, [live]);
}
