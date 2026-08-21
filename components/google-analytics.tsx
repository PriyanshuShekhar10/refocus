import Script from "next/script";

/**
 * Dashboard GA4 stream. Prefer NEXT_PUBLIC_GA_MEASUREMENT_ID in env;
 * falls back to the production dashboard measurement ID.
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
        strategy="afterInteractive"
      />
      <Script id="ga-gtag" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}');
        `}
      </Script>
    </>
  );
}
