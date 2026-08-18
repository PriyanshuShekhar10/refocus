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
    "https://*.posthog.com",
    "https://*.i.posthog.com",
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
    "https://*.posthog.com",
    "https://*.i.posthog.com",
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
  serverExternalPackages: ["firebase-admin", "disposable-email-domains"],
  images: {
    qualities: [75, 90],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.public.blob.vercel-storage.com",
      },
      {
        protocol: "https",
        hostname: "*.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "www.betterlaunch.co",
      },
    ],
  },
  async redirects() {
    // Post-cutover: marketing lives on the Astro site (apex refocus.co.in).
    // These are host-scoped to the dashboard host so the dashboard never
    // serves a landing page — its marketing routes bounce to the Astro site.
    const marketingHost = "dashboard.refocus.co.in";
    const toApex = (path: string) => `https://refocus.co.in${path}`;
    return [
      {
        source: "/",
        has: [{ type: "host", value: marketingHost }],
        destination: toApex("/"),
        // 301: marketing permanently moved to the apex, so link equity and
        // index signals from the old dashboard-host URLs consolidate there.
        permanent: true,
      },
      {
        // The careers page was removed from the marketing site, so old
        // dashboard-host /career links consolidate to the apex homepage.
        source: "/career",
        has: [{ type: "host", value: marketingHost }],
        destination: toApex("/"),
        permanent: true,
      },
    ];
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
      {
        // SEO: the product app is never a marketing surface, so keep it out of
        // the index on EVERY host it is served from — dashboard.refocus.co.in
        // as well as Vercel's *.vercel.app production/preview URLs, which are
        // duplicate copies of the app. Search authority consolidates on the
        // apex (refocus.co.in). Crawling stays allowed (no robots.txt block)
        // so Google still honors the 301s from / and /career to the apex home.
        source: "/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
    ];
  },
};

export default nextConfig;
