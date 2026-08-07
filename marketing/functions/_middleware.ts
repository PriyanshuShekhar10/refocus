// Cloudflare Pages Function middleware.
//
// Runs in front of the static Astro marketing site. If a visitor already has a
// valid NextAuth session cookie (shared on `.refocus.co.in`), we redirect the
// marketing entry pages straight to the product dashboard. Everything else
// (assets, invalid/expired sessions) falls through to the static site.

import { jwtDecrypt } from "jose";

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
const REDIRECT_PATHS = new Set(["/", "/career", "/career/"]);

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
    const key = await deriveKey(secret);
    const { payload } = await jwtDecrypt(token, key, { clockTolerance: 15 });
    return Boolean(payload && (payload.sub || payload.email));
  } catch {
    return false;
  }
}

export const onRequest = async (context: PagesContext): Promise<Response> => {
  const { request, env, next } = context;
  const url = new URL(request.url);

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
