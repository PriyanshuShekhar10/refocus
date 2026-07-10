import type { NextConfig } from "next";

const DAILY_DOMAIN = process.env.DAILY_DOMAIN || "";
const dailyOrigin = DAILY_DOMAIN ? `https://${DAILY_DOMAIN}` : "";
const dailyWildcard = "https://*.daily.co";
const isProd = process.env.NODE_ENV === "production";

/** Firebase Auth (Google sign-in popups and token exchange). */
const firebaseAuthConnectSrc = [
  "https://identitytoolkit.googleapis.com",
  "https://securetoken.googleapis.com",
  "https://www.googleapis.com",
  "https://*.googleapis.com",
  "https://accounts.google.com",
];
const firebaseAuthFrameSrc = [
  "https://accounts.google.com",
  "https://*.firebaseapp.com",
];
const firebaseAuthScriptSrc = [
  "https://apis.google.com",
  "https://www.gstatic.com",
];

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
    ...firebaseAuthScriptSrc,
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
    ...firebaseAuthConnectSrc,
  ].filter(Boolean),
  "frame-src": [
    dailyOrigin,
    dailyWildcard,
    ...firebaseAuthFrameSrc,
  ].filter(Boolean),
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
    value: [
      `camera=(self${dailyOrigin ? ` "${dailyOrigin}"` : ""})`,
      `microphone=(self${dailyOrigin ? ` "${dailyOrigin}"` : ""})`,
      `display-capture=(self${dailyOrigin ? ` "${dailyOrigin}"` : ""})`,
      "geolocation=()",
      "payment=()",
      "interest-cohort=()",
    ].join(", "),
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
  // Keep firebase-admin outside the serverless bundle so its native deps load
  // from node_modules at runtime (avoids ESM/CJS packaging issues on Vercel).
  serverExternalPackages: ["firebase-admin"],
  images: {
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "www.betterlaunch.co",
      },
    ],
  },
  async headers() {
    return [
      {
        // Apply security headers everywhere except Next-internal assets and
        // SSE endpoints (custom Content-Security-Policy can break streaming
        // proxies in some configurations).
        source: "/((?!_next/static|_next/image|api/chat/events).*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
