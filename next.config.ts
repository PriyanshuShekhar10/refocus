import type { NextConfig } from "next";

const DAILY_DOMAIN = process.env.DAILY_DOMAIN || "";
const dailyOrigin = DAILY_DOMAIN ? `https://${DAILY_DOMAIN}` : "";
const dailyWildcard = "https://*.daily.co";
const isProd = process.env.NODE_ENV === "production";

/**
 * Content Security Policy.
 *
 * Notes:
 * - Next.js needs 'unsafe-inline' for styles (CSS-in-JS). We accept this
 *   trade-off; the value of CSP for us is restricting script, frame, and
 *   connect sources, not inline styles.
 * - 'unsafe-eval' is needed in dev for HMR; omitted in prod.
 * - frame-src must allow the configured Daily subdomain so the call iframe
 *   can render. *.daily.co covers their CDN/redirect domains.
 */
const cspDirectives: Record<string, string[]> = {
  "default-src": ["'self'"],
  "script-src": [
    "'self'",
    "'unsafe-inline'",
    ...(isProd ? [] : ["'unsafe-eval'"]),
    "https://va.vercel-scripts.com",
    "https://vercel.live",
  ],
  "style-src": ["'self'", "'unsafe-inline'"],
  "img-src": ["'self'", "data:", "blob:", "https:"],
  "font-src": ["'self'", "data:"],
  "connect-src": [
    "'self'",
    dailyOrigin,
    dailyWildcard,
    "https://api.daily.co",
    "https://*.ably.io",
    "https://*.ably-realtime.com",
    "wss://*.ably.io",
    "wss://*.ably-realtime.com",
    "https://*.upstash.io",
  ].filter(Boolean),
  "frame-src": [dailyOrigin, dailyWildcard].filter(Boolean),
  "media-src": ["'self'", dailyOrigin, dailyWildcard].filter(Boolean),
  "worker-src": ["'self'", "blob:"],
  "object-src": ["'none'"],
  "base-uri": ["'self'"],
  "form-action": ["'self'"],
  "frame-ancestors": ["'self'"],
  "upgrade-insecure-requests": [],
};

const cspHeader = Object.entries(cspDirectives)
  .map(([directive, sources]) =>
    sources.length === 0 ? directive : `${directive} ${sources.join(" ")}`,
  )
  .join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: cspHeader },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Camera, mic, and screen-share are needed for the Daily.co prebuilt embed.
    value: `camera=(self ${dailyWildcard}), microphone=(self ${dailyWildcard}), display-capture=(self ${dailyWildcard}), geolocation=(), payment=(), interest-cohort=()`,
  },
  ...(isProd
    ? [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ]
    : []),
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Apply security headers everywhere except Next-internal assets and
        // SSE endpoints (custom Content-Security-Policy can break streaming
        // proxies in some configurations).
        source: "/((?!_next/static|_next/image|api/sessions/events|api/chat/events).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
