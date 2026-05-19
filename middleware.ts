import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

/**
 * Combined CSRF + auth middleware.
 *
 * - For mutating requests under /api/*, reject when Origin/Referer don't
 *   match the host. This is defense-in-depth on top of SameSite cookies and
 *   NextAuth's built-in CSRF tokens on its callback routes.
 * - For pages/APIs in the protected list, require a valid NextAuth JWT.
 *   API routes get a JSON 401; pages get redirected to /auth/login.
 */

const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Paths that require an authenticated session. Match by exact-or-prefix-with-slash. */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/backlog",
  "/profile",
  "/features",
  "/notes",
  "/sessions",
  "/chat",
  "/global-chat",
  "/api/friends",
  "/api/sessions",
  "/api/users",
  "/api/global-chat",
  "/api/chat",
  "/api/events",
  "/api/session-requests",
];

function pathIsProtected(pathname: string): boolean {
  return PROTECTED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/"),
  );
}

function hostOf(url: string | null): string | null {
  if (!url) return null;
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return null;
  }
}

function originMatchesHost(req: NextRequest): boolean {
  // x-forwarded-host beats host when present (Vercel sets it).
  const host = (
    req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? ""
  ).toLowerCase();
  if (!host) return true; // can't compare; let the route handler decide

  const originHost = hostOf(req.headers.get("origin"));
  const refererHost = hostOf(req.headers.get("referer"));

  // If the browser sent at least one of these, it MUST match the host. If it
  // sent neither (server-to-server, curl), allow — the route handler still
  // enforces session/rate-limit checks.
  if (!originHost && !refererHost) return true;
  if (originHost && originHost === host) return true;
  if (refererHost && refererHost === host) return true;
  return false;
}

export async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // ---- CSRF / same-origin check on mutating API requests ----
  if (MUTATING_METHODS.has(req.method) && pathname.startsWith("/api/")) {
    if (!originMatchesHost(req)) {
      return NextResponse.json(
        { error: "Cross-origin request blocked" },
        { status: 403 },
      );
    }
  }

  // ---- Auth check for protected paths ----
  if (pathIsProtected(pathname)) {
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
      const loginUrl = new URL("/auth/login", req.url);
      loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname + req.nextUrl.search);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Page paths
    "/dashboard/:path*",
    "/backlog/:path*",
    "/profile/:path*",
    "/features/:path*",
    "/notes/:path*",
    "/sessions/:path*",
    "/chat/:path*",
    "/global-chat/:path*",
    // All API paths so the CSRF guard applies broadly; the handler itself
    // decides whether auth is required.
    "/api/:path*",
  ],
};
