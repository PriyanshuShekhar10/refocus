import Script from "next/script";

/**
 * Dashboard GA4 stream. Prefer NEXT_PUBLIC_GA_MEASUREMENT_ID in env;
 * falls back to the production dashboard measurement ID.
 *
 * Uses beforeInteractive so the classic gtag snippet is present in the
 * initial HTML <head> (Google's installer / Tag Assistant detect that).
 */
const gaId = (
  process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID || "G-QLK6MHDM07"
).trim();

export function GoogleAnalytics() {
  if (!gaId) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`}
        strategy="beforeInteractive"
      />
      <Script id="ga-gtag" strategy="beforeInteractive">{`
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${gaId}');
`}</Script>
    </>
  );
}
