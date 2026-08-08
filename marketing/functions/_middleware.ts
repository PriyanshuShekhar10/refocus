// Cloudflare Pages Function middleware.
//
// Runs in front of the static Astro marketing site. If a visitor already has a
// valid NextAuth session cookie (shared on `.refocus.co.in`), we redirect the
// marketing entry pages straight to the product dashboard. Everything else
// (assets, invalid/expired sessions) falls through to the static site.

interface Env {
  NEXTAUTH_SECRET?: string;
  DASHBOARD_URL?: string;
}

type PagesContext = {
  request: Request;
  env: Env;
  next: () => Promise<Response>;
};

const SESSION_COOKIE_NAMES = [
  "__Secure-next-auth.session-token",
  "next-auth.session-token",
];

// Only these navigation paths auto-redirect logged-in users.
const REDIRECT_PATHS = new Set(["/"]);

// The single host search engines are allowed to index. Cloudflare also serves
// this project on its `*.pages.dev` alias (and preview/branch URLs), which are
// byte-for-byte duplicates of refocus.co.in. Those must not be indexed.
const CANONICAL_HOST = "refocus.co.in";

function parseCookies(header: string | null): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) out[key] = decodeURIComponent(val);
  }
  return out;
}

// NextAuth may split large cookies into `.0`, `.1`, ... chunks.
function readSessionToken(cookies: Record<string, string>): string | null {
  for (const base of SESSION_COOKIE_NAMES) {
    if (cookies[base]) return cookies[base];
    if (cookies[`${base}.0`]) {
      let joined = "";
      let i = 0;
      while (cookies[`${base}.${i}`] !== undefined) {
        joined += cookies[`${base}.${i}`];
        i += 1;
      }
      if (joined) return joined;
    }
  }
  return null;
}

async function deriveKey(secret: string): Promise<Uint8Array> {
  // Mirrors NextAuth v4: HKDF-SHA256, empty salt, fixed info, 32-byte key.
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    "HKDF",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: new Uint8Array(0),
      info: enc.encode("NextAuth.js Generated Encryption Key"),
    },
    keyMaterial,
    256,
  );
  return new Uint8Array(bits);
}

async function hasValidSession(token: string, secret: string): Promise<boolean> {
  try {
    // Lazy import so a bundling/runtime issue in `jose` can never take down
    // the whole middleware (host canonicalization must always run).
    const { jwtDecrypt } = await import("jose");
    const key = await deriveKey(secret);
    const { payload } = await jwtDecrypt(token, key, { clockTolerance: 15 });
    return Boolean(payload && (payload.sub || payload.email));
  } catch {
    return false;
  }
}

// Serve `response`, adding a noindex header when the request came in on a
// non-canonical host so duplicate copies (*.pages.dev, previews) stay out of
// search results. Redirects keep their semantics; the header is harmless there.
function guardIndexing(response: Response, hostname: string): Response {
  if (hostname === CANONICAL_HOST) return response;
  const guarded = new Response(response.body, response);
  guarded.headers.set("X-Robots-Tag", "noindex, nofollow");
  return guarded;
}

export const onRequest = async (context: PagesContext): Promise<Response> => {
  const { request, env, next } = context;
  const url = new URL(request.url);

  // Canonicalize www -> apex (301), preserving path + query.
  if (url.hostname === "www.refocus.co.in") {
    url.hostname = CANONICAL_HOST;
    return Response.redirect(url.toString(), 301);
  }

  const respond = async (): Promise<Response> => {
    // Only consider GET navigations to the marketing entry pages.
    if (request.method !== "GET" || !REDIRECT_PATHS.has(url.pathname)) {
      return next();
    }

    const secret = env.NEXTAUTH_SECRET;
    if (!secret) return next();

    const cookies = parseCookies(request.headers.get("cookie"));
    const token = readSessionToken(cookies);
    if (!token) return next();

    if (await hasValidSession(token, secret)) {
      const dashboard = env.DASHBOARD_URL || "https://dashboard.refocus.co.in";
      return Response.redirect(`${dashboard}/dashboard`, 302);
    }

    return next();
  };

  return guardIndexing(await respond(), url.hostname);
};
