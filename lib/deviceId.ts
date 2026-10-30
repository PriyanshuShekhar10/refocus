// Edge-safe: no DB import. Used by middleware.ts (Edge runtime) and by
// lib/auth.ts/route handlers (Node runtime) alike, mirroring how
// getClientIp (lib/ratelimit.ts) stays DB-free so it's usable everywhere.

export const DEVICE_ID_COOKIE = "rf_device_id";

const DEVICE_ID_MAX_AGE_SECONDS = 60 * 60 * 24 * 365 * 2; // ~2 years
const useSecureCookies = (process.env.NEXTAUTH_URL ?? "").startsWith("https://");

export function deviceIdCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    secure: useSecureCookies,
    maxAge: DEVICE_ID_MAX_AGE_SECONDS,
  };
}

type RequestLike =
  | Request
  | {
      headers?:
        | Record<string, string | string[] | undefined>
        | { get?: (key: string) => string | null };
      cookies?: { get?: (name: string) => { value?: string } | undefined };
    };

/** Read the device-id cookie off a request, tolerating NextRequest's
 * convenient `.cookies` jar and NextAuth's plain-headers-record shape alike
 * (same dual-shape handling as getClientIp). */
export function getDeviceId(req: RequestLike | null | undefined): string | null {
  if (!req) return null;

  if ("cookies" in req && typeof req.cookies?.get === "function") {
    const value = req.cookies.get(DEVICE_ID_COOKIE)?.value;
    if (value) return value;
  }

  let cookieHeader: string | null = null;
  if (req.headers) {
    if ("get" in req.headers && typeof req.headers.get === "function") {
      cookieHeader = req.headers.get("cookie");
    } else if (typeof req.headers === "object") {
      const record = req.headers as Record<string, string | string[] | undefined>;
      const val = record["cookie"] ?? record["Cookie"];
      cookieHeader = Array.isArray(val) ? val[0] ?? null : val ?? null;
    }
  }
  if (!cookieHeader) return null;

  for (const part of cookieHeader.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === DEVICE_ID_COOKIE) {
      const raw = part.slice(eq + 1).trim();
      return raw ? decodeURIComponent(raw) : null;
    }
  }
  return null;
}
