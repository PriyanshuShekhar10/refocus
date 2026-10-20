import { PostHog } from "posthog-node";

/** Same project as the browser SDK (components/posthog-provider.tsx). */
export const POSTHOG_KEY = process.env.NEXT_PUBLIC_POSTHOG_KEY?.trim() || "";
export const POSTHOG_HOST = (process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "https://us.i.posthog.com").replace(/\/+$/, "");

/** Errors and logs go to PostHog in production (or locally with NEXT_PUBLIC_POSTHOG_DEBUG=1). */
export function isPostHogServerEnabled(): boolean {
  if (!POSTHOG_KEY) return false;
  if (process.env.NODE_ENV === "test") return false;
  if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_POSTHOG_DEBUG !== "1") return false;
  return true;
}

let client: PostHog | null = null;

/** Server client tuned for serverless: send each event immediately. */
export function getPostHogServer(): PostHog | null {
  if (!isPostHogServerEnabled()) return null;
  if (!client) {
    client = new PostHog(POSTHOG_KEY, { host: POSTHOG_HOST, flushAt: 1, flushInterval: 0 });
  }
  return client;
}

/** The browser SDK's cookie for this project: `ph_<key>_posthog`. */
export function posthogCookieName(key = POSTHOG_KEY): string {
  return `ph_${key}_posthog`;
}

/**
 * Read the visitor's PostHog identity from a Cookie header, so server errors
 * attach to the same person and session replay as their browser events.
 */
export function posthogIdentityFromCookie(
  cookieHeader: string | null | undefined,
  key = POSTHOG_KEY,
): { distinctId?: string; sessionId?: string } {
  if (!cookieHeader || !key) return {};
  const name = posthogCookieName(key);
  const part = cookieHeader
    .split(/;\s*/)
    .find((c) => c.startsWith(`${name}=`));
  if (!part) return {};
  try {
    const value = JSON.parse(decodeURIComponent(part.slice(name.length + 1))) as {
      distinct_id?: unknown;
      $sesid?: unknown;
    };
    const distinctId = typeof value.distinct_id === "string" ? value.distinct_id : undefined;
    const sesid = Array.isArray(value.$sesid) ? value.$sesid[1] : undefined;
    return { distinctId, sessionId: typeof sesid === "string" ? sesid : undefined };
  } catch {
    return {};
  }
}
